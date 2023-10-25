import { json, urlencoded } from "express";
import { Middleware } from "./common";

export default [
    json({ limit: "50mb" }),
    urlencoded({ extended: true, limit: "10mb" }),
] as Middleware[];
