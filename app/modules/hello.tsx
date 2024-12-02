import React from "react";
import { procedure$ } from "../utils/macros";
import { z } from "zod";
import { Form } from "@remix-run/react";

export const sayHello = procedure$("rpc.sayHello")
  .input(
    z.object({
      name: z.string(),
    })
  )
  .handler(async ({ input }) => {
    return {
      message: `Hello ${input.name}!`,
    };
  });

export function Hello({
  action = sayHello,
}: {
  action?: typeof sayHello;
}) {
  const [name, setName] = React.useState("John Doe");
  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        action({ name }).then(({ message }) => {
          alert(message);
        });
      }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit">Say Hello</button>
    </Form>
  );
}
