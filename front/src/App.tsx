import React from "react";
import { makeStyles, createStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Divider from "@material-ui/core/Divider";
import TextField from "@material-ui/core/TextField";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Avatar from "@material-ui/core/Avatar";
import Fab from "@material-ui/core/Fab";
import SendIcon from "@material-ui/icons/Send";
import { Input, Button, Card, CardHeader, Dialog, IconButton, DialogContent, DialogActions, DialogTitle } from "@material-ui/core";
import { GetApp, AttachFile, CloudUpload } from "@material-ui/icons";
import useSwr from "swr";
import prettyBytes from "pretty-bytes";


import {ConnectionInfo} from "./global.interface";
import { MessageWithTimestamp } from "./message.interface";

const useStyles = makeStyles(createStyles({
  table: {
    minWidth: 650,
  },
  chatSection: {
    width: "100%",
    height: "100vh",
  },
  headBG: {
    backgroundColor: "#e0e0e0",
  },
  borderRight500: {
    borderRight: "1px solid #e0e0e0",
  },
  messageArea: {
    overflowY: "auto",
  },
  alignRight: {
    textAlign: "right",
  },
}));

const ClientItem = (props: { name?: string, close?: boolean, onClick?:()=>void } = { name: "Select one" }) => {
  const name = props.name || "Select One";
  return (
    <ListItem button onClick={ props.onClick }>
      <ListItemIcon>
        <Avatar alt={name}>{name?.[0]}</Avatar>
      </ListItemIcon>
      <ListItemText primary={name}>{name}</ListItemText>
      {props.close && <ListItemText secondary="offline" style={{ textAlign: "right" }}></ListItemText>}
    </ListItem>
  );
};

const MessageItem = (props: MessageWithTimestamp) => {
  if (props.type === "text") {
    return (
      <ListItem style={{ textAlign: props.self ? "right" : "left" }}>
        <Grid container>
          <Grid item xs={12}>
            <ListItemText primary={ props.text} ></ListItemText>
          </Grid>
          <Grid item xs={12}>
            <ListItemText secondary={new Date(props.timestamp).toLocaleString()}></ListItemText>
          </Grid>
        </Grid>
      </ListItem>
    ); 
  } else if (props.type === "file") {
    return (
      <ListItem>
        <Grid container>
          <Grid item xs={12}>
            <Card style={{ float: props.self ? "right" : "left", minWidth: "240px" }}>
              <CardHeader
                avatar={
                  <Avatar aria-label="attach">
                    <AttachFile/>
                  </Avatar>
                }
                action={
                  <IconButton aria-label="download" href={`/api/download?path=${props.file.tmpFile}&name=${props.file.fileName}`}>
                    <GetApp/>
                  </IconButton>
                }
                title={props.file.fileName}
                subheader={prettyBytes(props.file.size)}
              />
            </Card>
          </Grid>
          <Grid item xs={12}>
            <ListItemText style={{ textAlign: props.self ? "right" : "left" }} secondary={new Date(props.timestamp).toLocaleString()}></ListItemText>
          </Grid>
        </Grid>
      </ListItem>
    );
  } else {
    return null;
  }
};

const Chat = () => {
  const classes = useStyles();

  const [connections, setConnections] = React.useState<(ConnectionInfo & {update: number})[]>([]);

  const [selectConnection, setSelectConnection] = React.useState<ConnectionInfo>();

  const [history, setHistory] = React.useState<MessageWithTimestamp[]>([]);

  const [text, setText] = React.useState("");
  const [file, setFile] = React.useState<File>();

  const [open, setOpen] = React.useState(false);

  const area = React.createRef<HTMLDivElement>();

  const {data} = useSwr<ConnectionInfo[]>("/api/client");

  React.useEffect(() => {
    if (data) {
      setConnections(data.map(v => ({...v, update: Date.now()})));
    }
  }, [data]);

  React.useEffect(() => {
    // eslint-disable-next-line no-restricted-globals
    const client = new WebSocket(location.origin.replace(/^http/, "ws"));
    client.onopen = () => {
      client.send('{"event":"events"}');
    };
    client.addEventListener("message", (data) => {
      const connectionInfo: ConnectionInfo = JSON.parse(data.data);
      setConnections(connection => {
        connection = connection.concat();
        let index = connection.findIndex(v => v.id === connectionInfo.id);
        if (index === -1)
          index = connection.length;
        connection[index] = { ...connectionInfo, update: Date.now() };
        return connection;
      });
    });
    return () => client.close();
  }, []);

  React.useEffect(() => {
    if (area.current) {
      area.current.scroll({ top: area.current.scrollHeight, behavior: "smooth" });
      area.current.addEventListener("DOMNodeInserted", event => {
        const currentTarget = event.target as HTMLDivElement;
        currentTarget.scroll({ top: currentTarget.scrollHeight, behavior: "smooth" });
      });
    }
  }, [area]);

  React.useEffect(() => {
    setHistory([]);
    // eslint-disable-next-line no-restricted-globals
    const client = new WebSocket(location.origin.replace(/^http/, "ws"));
    client.onopen = () => {
      client.send(JSON.stringify({
        event: "message",
        data: {
          id: selectConnection?.id,
        },
      }));
    };
    client.addEventListener("message", (data) => {
      const history: MessageWithTimestamp | MessageWithTimestamp[] = JSON.parse(data.data);
      if (Array.isArray(history)) {
        setHistory(history);
      } else {
        setHistory(his => his.concat(history));
      }
    });
    return () => client.close();
  }, [selectConnection]);

  const send = () => {
    const form = new URLSearchParams();
    form.set("text", text);
    fetch(`/api/${selectConnection?.id}/send`, {
      method: "POST",
      body: form,
    });
    setText("");
  };

  const uploadFile = () => {
    if (file) {
      const form = new FormData();
      form.set("file", file);
      fetch(`/api/${selectConnection?.id}/send/file`, {
        method: "POST",
        body: form,
      });
      setOpen(false);
      setFile(undefined);
    }
  };

  return (
  <Grid container className={classes.chatSection}>
    <Grid item xs={3} className={classes.borderRight500}>
        <List>
          <ClientItem {...selectConnection}/>
        </List>
        <Divider />
        <List>
          {connections.sort((a, b) => a.update - b.update).map(v => (
            <ClientItem key={v.id} {...v} onClick={ ()=>setSelectConnection(v) }/>
          ))}
        </List>
      </Grid>
      <Grid container item xs={9} direction="column" style={ {height: "100%"} }>
        <Grid item style={{ flexGrow: 1, maxHeight: "calc(100vh - 96px - 16px)", overflowY: "auto" }} ref={area}>
          <List className={classes.messageArea}>
            {history.map(msg => <MessageItem key={msg.timestamp} {...msg} />)}
            {selectConnection?.close && 
              <ListItem>
              <Grid container justify="center" alignItems="center">
                <Grid item>CLOSED</Grid>  
              </Grid>
              </ListItem>
            }
          </List>
        </Grid>
        <Divider />
        <Grid item container style={{ padding: "20px" }}>
          <Grid item style={{ flexGrow: 1 }}>
            <TextField disabled={!selectConnection || selectConnection.close} label="Type Something" fullWidth value={text} onChange={e => setText(e.target.value)} onKeyPress={ e => e.charCode === 13 && send()}/>
          </Grid>
          <Grid item style={{marginRight: "10px"}}>
            <Fab disabled={!selectConnection || selectConnection.close} color="primary" aria-label="send" onClick={send}><SendIcon /></Fab>
          </Grid>
          <Grid item>
            <Fab disabled={!selectConnection || selectConnection.close} color="primary" aria-label="upload" onClick={() => setOpen(true)}><CloudUpload /></Fab>
            <Dialog onClose={() => setOpen(false)} open={open}>
              <DialogTitle>Choose File</DialogTitle>
              <DialogContent>
                <Input type="file" placeholder="file" onInput={ (e: any)=>setFile(e.target.files[0])}/>
              </DialogContent>
              <DialogActions>
                <Button onClick={uploadFile} color="primary">
                  Upload
                </Button>
              </DialogActions>
            </Dialog>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default Chat;
