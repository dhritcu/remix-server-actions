import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { serverOnly$, clientOnly$ } from "vite-env-only/macros";
import superjson from "superjson";
import type { z } from "zod";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type AnyFn = (...args: any[]) => any;

const serverFn = serverOnly$(
  (fn: AnyFn) => (args: LoaderFunctionArgs | ActionFunctionArgs) => fn(args)
);

const clientFn = clientOnly$((key: string) =>
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  async (...args: any[]) => {
    const hasBody = args.length > 0 && args[0] !== undefined;
    const body = hasBody ? superjson.stringify(args[0]) : undefined;
    console.log("body", body);
    const response = await fetch(
      `/rpc/${key}`,
      hasBody
        ? {
            method: "POST",
            body,
          }
        : {
            method: "GET",
          }
    ).then((res) => res.text());
    console.log("response", response);
    const output = superjson.parse(response);
    console.log("output", output);
    return output;
  }
);

export const procedure$ = (key: `rpc.${string}`) => ({
  input: <
    TInputSchema extends z.ZodTypeAny,
    TInput extends z.infer<TInputSchema>
  >(
    input: TInputSchema
  ) => {
    return {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      handler: <TOutput extends Record<string, any>>(
        fn: (args: ActionFunctionArgs & { input: TInput }) => TOutput
      ) =>
        (typeof serverFn !== "undefined" ? serverFn(fn) : clientFn?.(key)) as (
          input: TInput
        ) => TOutput,
    };
  },
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  handler: <TOutput extends Record<string, any>>(
    fn: (args: LoaderFunctionArgs) => TOutput
  ) =>
    (typeof serverFn !== "undefined"
      ? serverFn(fn)
      : clientFn?.(key)) as () => TOutput,
});
