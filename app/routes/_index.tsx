import { sayOtherHello } from "../modules/other-helllo";
import { Hello } from "../modules/hello";


export default function Index() {
  return (
    <>
      <Hello />
      <Hello action={sayOtherHello} />
    </>
  );
}
