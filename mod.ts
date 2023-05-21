//テスト/デバッグ用
//@ts-ignore: Missing module or type define
import { load } from "https://deno.land/std@0.187.0/dotenv/mod.ts";
import UNIPA from "./src/unipa.ts";
import "./src/encoding.min.js";
"./src/encoding.min.js";

type ENV = {
  BASEURL: string;
  USERID: string;
  PASSWORD: string;
  SESSIONDATA?: string;
};

function decodeMIMEText(encodedText: string) {
  //@ts-ignore: UMD
  return encodedText.replace(
    /=\?ISO-2022-JP\?B\?(.*?)\?=/ig,
    (_a, b) =>
      Encoding.codeToString(
        Encoding.convert(Encoding.base64Decode(b), "UNICODE", "JIS"),
      ),
  ).replace('attachment; filename="', "").replace('"', "");
}

async function test() {
  const env = await load({ defaultsPath: null, examplePath: null }) as ENV;
  const session = [] as { userId: string; shikibetsuCd: string }[];
  if (env.SESSIONDATA) {
    session.push(
      JSON.parse(env.SESSIONDATA) as { userId: string; shikibetsuCd: string },
    );
  }
  const unipa = new UNIPA(env.BASEURL, ...session);
  if (!env.SESSIONDATA) {
    await unipa.login({ userId: env.USERID, password: env.PASSWORD });
  }
  console.log(unipa.getPortalURL());
  const timetable = await unipa.getTimetableInfo()
  console.log(timetable);
  const classInfo = timetable.jgkmInfo[0]
  console.log(await unipa.getSyllbusInfo({
    gakkiNo: classInfo.gakkiNo.toString(),
    jigenNo: classInfo.jigenNo.toString(),
    jugyoCd: classInfo.jugyoCd,
    jugyoKbn: classInfo.jugyoKbn,
    kaikoNendo: classInfo.kaikoNendo.toString(),
    kaikoYobi: classInfo.kaikoYobi.toString(),
    nendo: classInfo.nendo.toString()
  }))
  // deno-lint-ignore no-debugger
  debugger;
  console.log(unipa._getSessionInfo());
}
await test();
