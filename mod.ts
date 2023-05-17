//テスト/デバッグ用
//@ts-ignore: Missing module or type define
import { load } from "https://deno.land/std@0.187.0/dotenv/mod.ts";
import UNIPA from "./src/unipa.ts";

type ENV = {
  BASEURL: string;
  USERID: string;
  PASSWORD: string;
  SESSIONDATA?: string;
};

async function test() {
  const env = await load({ defaultsPath: null, examplePath: null }) as ENV;
  const session = [] as {userId: string, shikibetsuCd: string, cookie: string}[];
  if (env.SESSIONDATA) {
    session.push(JSON.parse(env.SESSIONDATA) as { userId: string, shikibetsuCd: string, cookie: string})
  }
  const unipa = new UNIPA(env.BASEURL, ...session);
  if (!env.SESSIONDATA) {
    await unipa.login({ userId: env.USERID, password: env.PASSWORD });
  }
  console.log(await unipa.getKeijiList(true));
  console.log(JSON.stringify(unipa._getSessionInfo()))
}
await test();
// deno-lint-ignore no-debugger
debugger;
