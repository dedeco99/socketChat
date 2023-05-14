import express from "express";
import { createServer } from "http";

import { handler } from "../build/handler.js";

import socketIO from "./socketIO.js";

const app = express();
const server = createServer(app);

socketIO(server);

// SvelteKit should handle everything else using Express middleware
// https://github.com/sveltejs/kit/tree/master/packages/adapter-node#custom-server
app.use(handler);

server.listen(3000);
