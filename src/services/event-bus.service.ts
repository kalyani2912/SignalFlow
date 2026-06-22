import { EventEmitter } from "events";
import type { PipelineResult } from "./pipeline.service.js";

export class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  publishPipelineResult(result: PipelineResult): void {
    this.emit("signal", result);
  }
}
