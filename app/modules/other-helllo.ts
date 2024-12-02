import { procedure$ } from "../utils/macros";
import { z } from "zod";

export const sayOtherHello = procedure$("rpc.sayOtherHello")
  .input(z.object({ name: z.string() }))
  .handler(async ({ input, request }) => {
    const url = new URL(request.url);
    const path = url.pathname;
    console.debug("SERVER: sayOtherHello", input, path);
    return {
      message: `Hi ${input.name}!`,
    };
  });
