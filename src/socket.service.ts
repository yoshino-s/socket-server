import { Server } from "net";
import { promisify } from "util";

import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { Subject } from "rxjs";

import { Connection } from "./connection";

@Injectable()
export class SocketService implements OnApplicationBootstrap, OnApplicationShutdown{
  server: Server;
  connections = new Map<string, Connection>();
  updateSubject = new Subject<Connection>();
  private readonly logger = new Logger(SocketService.name);
  constructor() {
    //
  }
  async onApplicationBootstrap() {
    this.server = new Server();
    await promisify(this.server.listen.bind(this.server))(3001);
    this.server.on("error", (err) => {
      this.logger.error(err);
    });
    this.server.on("connection", (socket) => {
      const conn = new Connection(socket);
      console.log(conn.connectionInfo);
      this.connections.set(conn.connectionInfo.id, conn);
      this.updateSubject.next(conn);
      conn.on("close", () => {
        this.updateSubject.next(conn);
      });
      conn.on("info", () => {
        this.updateSubject.next(conn);
      });
    });
    return true;
  }

  async onApplicationShutdown() {
    await promisify(this.server.close.bind(this.server))();
  }
}
