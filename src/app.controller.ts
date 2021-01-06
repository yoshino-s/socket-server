import { existsSync } from "fs";

import { Body, Controller, Get, NotFoundException, Param, Post, Query, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";

import { SocketService } from "./socket.service";

@Controller("api")
export class AppController {
  constructor(
    private readonly socketService: SocketService,
  ) {
    //
  }
  @Get("client")
  listClient() {
    return Array.from(this.socketService.connections.values()).map(v=>v.connectionInfo);
  }
  @Get("client/:id")
  getClient(@Param("id") id: string) {
    const res = this.socketService.connections.get(id);
    if (res)
      return res.connectionInfo;
    else {
      throw new NotFoundException();
    }
  }
  @Post(":id/send")
  async sendText(@Param("id") id: string, @Body("text") text: string) {
    const res = this.socketService.connections.get(id);
    if (res && !res.connectionInfo.close) {
      await res.sendText(text);
      return res.connectionInfo;
    }
    else {
      throw new NotFoundException();
    }
  }
  @Post(":id/send/file")
  @UseInterceptors(FileInterceptor("file"))
  async sendFile(@Param("id") id: string, @UploadedFile() file) {
    const res = this.socketService.connections.get(id);
    if (res && !res.connectionInfo.close) {
      await res.sendFile(file.path, file.fileName);
      return res.connectionInfo;
    }
    else {
      throw new NotFoundException();
    }
  }

  @Get("download")
  downloadContent(@Query("path") path: string, @Query("name") name: string, @Res() res: Response) {
    if (!existsSync(path)) {
      throw new NotFoundException();
    }
    res.download(path, name);
  }
}
