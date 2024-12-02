import { procedure$ } from "../utils/macros";
import { z } from "zod";

export const sayOtherHello = procedure$("rpc.sayOtherHello")
  .input(z.object({ name: z.string() }))
  .handler(async ({ input }) => {
    console.debug("SERVER: sayOtherHello", input);
    return {
      message: `Hi ${input.name}!`,
    };
  });
