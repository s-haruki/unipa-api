//テスト/デバッグ用
//@ts-ignore: Missing module or type define
import { load } from "https://deno.land/std@0.187.0/dotenv/mod.ts";
import UNIPA from "./src/unipa.ts";

type ENV = {
  BASEURL: string;
  USERID: string;
  PASSWORD: string;
};

async function test() {
  const env = await load({ defaultsPath: null, examplePath: null }) as ENV;
  const unipa = new UNIPA(env.BASEURL);
  await unipa.login({ userId: env.USERID, password: env.PASSWORD });
  console.log(await unipa.getTimetableInfo());
}
await test();
// deno-lint-ignore no-debugger
debugger;
