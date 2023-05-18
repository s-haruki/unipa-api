//テスト/デバッグ用
//@ts-ignore: Missing module or type define
import { load } from "https://deno.land/std@0.187.0/dotenv/mod.ts";
import UNIPA from "./src/unipa.ts";
import "./src/encoding.min.js"; "./src/encoding.min.js";

type ENV = {
  BASEURL: string;
  USERID: string;
  PASSWORD: string;
  SESSIONDATA?: string;
};

function decodeMIMEText(encodedText: string) {
  //@ts-ignore: UMD
  return encodedText.replace(/=\?ISO-2022-JP\?B\?(.*?)\?=/ig, (_a, b) => Encoding.codeToString(Encoding.convert(Encoding.base64Decode(b), "UNICODE", "JIS"))).replace('attachment; filename="', "").replace('"', "");
}

async function test() {
  const env = await load({ defaultsPath: null, examplePath: null }) as ENV;
  const session = [] as {userId: string, shikibetsuCd: string}[];
  if (env.SESSIONDATA) {
    session.push(JSON.parse(env.SESSIONDATA) as { userId: string, shikibetsuCd: string})
  }
  const unipa = new UNIPA(env.BASEURL, ...session);
  if (!env.SESSIONDATA) {
    await unipa.login({ userId: env.USERID, password: env.PASSWORD });
  }
  console.log(unipa.getPortalURL());
  console.log(await unipa.getKeijiList(true));
  const Keiji = await unipa.getKeijiDetail(6,2);
  console.log(Keiji.files);
  const file = await Keiji.files[0].downloadFile();
  const reader = file.body?.getReader();
  console.log(file.headers)
  //@ts-ignore: Deno
  const savedFile = await Deno.create(decodeMIMEText(file.headers.get("content-disposition")));
  while (true) {
    const chunk = await reader?.read();
    if (chunk?.value) savedFile.writeSync(chunk.value);
    if (chunk?.done) break;
  }
  savedFile.close();
  console.log(JSON.stringify(unipa._getSessionInfo()));
  // deno-lint-ignore no-debugger
  debugger;
}
await test();
