import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import superjson from "superjson";
import { sayHello } from "../modules/hello";
import { sayOtherHello } from "../modules/other-helllo";

async function runProcedure(
	args: ActionFunctionArgs | LoaderFunctionArgs,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	procedure: any,
) {
	const request = args.request.clone();
	let body: string | undefined;
	try {
		body = await request.text();
	} catch (e) {
		body = undefined;
	}
	const input = body ? superjson.parse(body) : undefined;
	const output = await procedure({ ...args, request, input });
  return new Response(superjson.stringify(output));
}

function getProcedure(_key: string) {
      switch (_key) {
        
      case 'rpc.sayOtherHello': 
        return sayOtherHello;

      case 'rpc.sayHello': 
        return sayHello;
        default:
          throw new Error(`Procedure handler for ${_key} not found`);
      }
    }

export const handler = (args: ActionFunctionArgs | LoaderFunctionArgs) => {
	const procedureKey = args.params.key;
	if (!procedureKey) throw new Error("Procedure key is required");
	const procedure = getProcedure(procedureKey);
	return runProcedure(args, procedure);
};

export const loader = handler;
export const action = handler;