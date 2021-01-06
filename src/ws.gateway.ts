import { MessageBody, SubscribeMessage, WebSocketGateway, ConnectedSocket } from "@nestjs/websockets";
import WebSocket from "ws";
import { fromEvent } from "rxjs";
import { map } from "rxjs/operators";

import { SocketService } from "./socket.service";
import { Message } from "./message.interface";



@WebSocketGateway()
export class WsGateway {
  constructor(
    private readonly socketService: SocketService,
  ) {
    //
  }

  @SubscribeMessage("events")
  public events() {
    return this.socketService.updateSubject.asObservable().pipe(map(v=>v.connectionInfo));
  }

  @SubscribeMessage("message")
  public message(
    @MessageBody() data: any,
    @ConnectedSocket() socket: WebSocket,
  ) {
    const id = data?.id;
    const res = this.socketService.connections.get(id);
    if (res) {
      socket.send(JSON.stringify(res.history));
      if (res.connectionInfo.close) {
        socket.terminate();
        return;
      }
      const observable = fromEvent<Message>(res, "message");
      res.on("close", () => {
        socket.terminate();
      });
      return observable;
    } else {
      socket.terminate();
    }
  }
}
