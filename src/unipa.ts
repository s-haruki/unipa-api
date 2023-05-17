import { DOMParser, HTMLDocument } from "./deps.ts";
import Fetch from "./fetch.ts";

export type Auth = {
  userId: string;
  password: string;
};

export type AuthCookie = {
  cookie: string;
};

export type CommonResponse = {
  authResult: true;
  result: boolean;
  displayMessage?: string;
} | {
  authResult: false;
  message?: string;
  resultStatus?: string;
};

export type AuthResponse = CommonResponse & {
  gakusekiCd: string;
  displayName: string;
  shikibetsuCd: string;
};

export type GakkiInfo = {
  gakkiName: string;
  gakkiNo: number;
  nendo: number;
};

export type ClassProperty = {
  kaikoNendo: string;
  jigenNo: string;
  nendo: string;
  gakkiNo: string;
  kaikoYobi: string;
  jugyoKbn: string;
  jugyoCd: string;
};

export type ClassInfo = CommonResponse & {
  jugyoMemo: {
    memo?: string;
  };
  /** シラバスが公開されているか */
  syllabusPubFlg: boolean;
  /** 掲示 休講情報など */
  keijiInfo: unknown[];
  syuKetuKanriFlg: boolean;
  attInfo: [
    {
      syussekiKaisu: number;
      koketuKaisu: number;
      kessekiKaisu: number;
      tikokuKaisu: number;
      sotaiKaisu: number;
    },
  ];
  JgkmInfo: {
    jugyoStartTime: string;
    jugyoEndTime: string;
  };
};

export type TimetableInfoResponse = CommonResponse & {
  jgkmInfo: {
    jugyoName: string;
    /** 開講曜日 月曜日から順に1,2,3...となる*/
    kaikoYobi: number;
    jugyoCd: number;
    kyostName: string;
    gakkiNo: number;
    kyoinName: string;
    jigenNo: number;
    kaikoNendo: number;
    /** 授業区分 1:通常 2:集中講義 */
    jugyoKbn: string;
    jugyoStartTime: string;
    jugyoEndTime: string;
    keijiInfo: {
      /** 授業掲示の未読項目数 */
      midokCnt: number;
    };
    nendo: number;
  }[];
  gakkiInfo: GakkiInfo;
};

export type CommonRequest = {
  data?: Record<string, string>;
  option?: Record<string, string>;
  header: {
    serviceid?: string;
    funcId?: string;
    deviceId: string;
    shikibetsuCd?: string;
    userId: string;
  };
};

export default class UNIPA {
  /** Fetcher */
  private fetch: Fetch;

  /** ユーザーID */
  private userId?: string;

  /** トークン(のようなもの) */
  private shikibetsuCd?: string;
  /** 現在のクッキー */
  private cookie?: string;

  /** UNIPA APIを初期化します */
  constructor(
    baseurl: string,
    authProperty?: { userId: string; shikibetsuCd: string; cookie: string },
  ) {
    this.fetch = new Fetch(baseurl);
    if (authProperty) {
      this.userId = authProperty.userId;
      this.shikibetsuCd = authProperty.shikibetsuCd;
      this.cookie = authProperty.cookie;
    }
  }

  private getComSunFacesVIEW(dom: HTMLDocument) {
    const input = dom.getElementById("com.sun.faces.VIEW")!;
    const comSunFacesVIEW = input.getAttribute("value");
    if (!comSunFacesVIEW) throw Error("Could not get com.sun.faces.VIEW");
    return comSunFacesVIEW;
  }

  private parseTextToDOM(text: string): HTMLDocument {
    const dom = new DOMParser().parseFromString(text, "text/html");
    if (!dom) {
      throw Error("Could not parse HTML text.");
    }
    return dom;
  }

  private checkResponseAuthStatus(responseJson: CommonResponse) {
    if (responseJson.authResult) {
      return true;
    } else {
      throw new Error(responseJson.message);
    }
  }

  async checkAuthStatus() {
    const res = await this.fetch.getSmartphoneAPI(
      {
        header: {
          userId: this.userId,
          shikibetsuCd: this.shikibetsuCd,
          serviceid: "login",
          deviceId: "i" + "12345678-9ABC-4DEF-0123-456789ABCDEF",
        },
        data: {
          deviceId: "i" + "12345678-9ABC-4DEF-0123-456789ABCDEF",
          userId: this.userId,
        },
      } as CommonRequest,
      this.cookie,
    );
    const resJson = (await res.json()) as { authResult: boolean };
    return resJson.authResult;
  }

  private updateCookie(response: Response) {
    this.cookie = response.headers
      .get("set-cookie")!
      .match(/JSESSIONID=.*?:-1;/)![0];
  }

  async login(auth: Auth) {
    const res = await this.fetch.getSmartphoneAPI(
      {
        header: {
          userId: auth.userId,
          serviceid: "AppLoginInfoService",
          password: auth.password,
          deviceId: "i" + "12345678-9ABC-4DEF-0123-456789ABCDEF",
        },
        data: {
          userId: auth.userId,
          deviceId: "i" + "12345678-9ABC-4DEF-0123-456789ABCDEF",
          password: auth.password,
        },
      } as CommonRequest,
      this.cookie,
    );
    this.updateCookie(res);
    const resJson = (await res.json()) as AuthResponse;
    if (resJson.authResult && resJson.result) {
      this.userId = auth.userId;
      this.shikibetsuCd = resJson.shikibetsuCd;
      console.log(resJson);
    } else {
      throw new Error("Login Failed");
    }
    return {
      result: true,
      authResult: true,
      gakusekiCd: resJson.gakusekiCd,
      shikibetsuCd: resJson.shikibetsuCd,
      cookie: this.cookie,
    };
  }

  async getMaxJigenNo() {
    const res = await this.fetch.getSmartphoneAPI(
      {
        header: {
          userId: this.userId,
          serviceid: "AppGetMaxJigenNoService",
          deviceId: "i" + "12345678-9ABC-4DEF-0123-456789ABCDEF",
          shikibetsuCd: this.shikibetsuCd,
        },
        data: {},
      } as CommonRequest,
      this.cookie,
    );
    const resJson = (await res.json()) as CommonResponse & {
      maxJigenNo: number;
    };
    this.checkResponseAuthStatus(resJson);
    this.updateCookie(res);
    return resJson;
  }

  async getServices() {
    const res = await this.fetch.getSmartphoneAPI(
      {
        header: {
          shikibetsuCd: this.shikibetsuCd,
          userId: this.userId,
          serviceid: "AppMenuService",
          deviceId: "i12345678-9ABC-4DEF-0123-456789ABCDEF",
        },
        data: {
          userId: this.userId,
        },
      } as CommonRequest,
      this.cookie,
    );
    const resJson = (await res.json()) as CommonResponse & {
      /** 学期数 (大体2まで) */
      maxGakkiNo: number;
      /**
       * アプリから使える機能のID? \
       * Apa001 ~ 002: NULL \
       * Apa003: 設定(2つ目) \
       * Apa004: 不明(メニュー項目なし) \
       * Apa005: NULL \
       * Apa006: 掲示板(2つ目) \
       * Apa007: NULL \
       * Apa008: 学生出欠状況確認 \
       * Apa009: シラバス照会 \
       * Apa010: スマホサイトへ(2つ目) \
       * Apa011 ~ 019: NULL
       */
      enableFuncIdList: string[];
    };
    this.checkResponseAuthStatus(resJson);
    this.updateCookie(res);
    return resJson;
  }

  async getUnreadInfosCount() {
    const res = await this.fetch.getSmartphoneAPI(
      {
        header: {
          shikibetsuCd: this.shikibetsuCd,
          userId: this.userId,
          serviceid: "AppGetMidokKeijiCntService",
          deviceId: "i12345678-9ABC-4DEF-0123-456789ABCDEF",
        },
        data: {},
      } as CommonRequest,
      this.cookie,
    );
    const resJson = (await res.json()) as CommonResponse & { keijiCnt: number };
    this.checkResponseAuthStatus(resJson);
    this.updateCookie(res);
    return resJson;
  }

  async getTimetableInfo(gakkiInfo?: { kaikoNendo: string; gakkiNo: string }) {
    const res = await this.fetch.getSmartphoneAPI(
      {
        header: {
          shikibetsuCd: this.shikibetsuCd,
          userId: this.userId,
          serviceid: "AppGetJkwrService",
          deviceId: "i12345678-9ABC-4DEF-0123-456789ABCDEF",
        },
        data: {
          userId: this.userId,
          ...(gakkiInfo ?? {}),
        },
      } as CommonRequest,
      this.cookie,
    );
    const resJson = (await res.json()) as TimetableInfoResponse;
    this.checkResponseAuthStatus(resJson);
    this.updateCookie(res);
    return resJson;
  }

  async getClassInfo(classProperty: ClassProperty) {
    const res = await this.fetch.getSmartphoneAPI(
      {
        header: {
          shikibetsuCd: this.shikibetsuCd,
          userId: this.userId,
          serviceid: "AppGetJugyoDetailService",
          deviceId: "i12345678-9ABC-4DEF-0123-456789ABCDEF",
        },
        data: classProperty,
      } as CommonRequest,
      this.cookie,
    );
    const resJson = (await res.json()) as ClassInfo;
    this.checkResponseAuthStatus(resJson);
    this.updateCookie(res);
    return resJson;
  }

  async setClassMemo(classProperty: ClassProperty, memo: string) {
    const res = await this.fetch.getSmartphoneAPI(
      {
        header: {
          shikibetsuCd: this.shikibetsuCd,
          userId: this.userId,
          serviceid: "AppJugyoMemoInfoService",
          deviceId: "i12345678-9ABC-4DEF-0123-456789ABCDEF",
        },
        data: {
          jugyoMemo: memo,
          nendo: classProperty.nendo,
          jugyoCd: classProperty.jugyoCd,
        },
      } as CommonRequest,
      this.cookie,
    );
    const resJson = (await res.json()) as ClassInfo;
    this.checkResponseAuthStatus(resJson);
    this.updateCookie(res);
    return resJson;
  }

  /* async */ _getKeijiList(_showAll = true) {
    //WIP
    return;

    // await this.checkAuthStatus();
    // const res = await this.fetch.getSmartphoneAPI(
    //   {
    //     option:{
    //       buttonDsp:"0"
    //     },
    //     header: {
    //       deviceId: "i12345678-9ABC-4DEF-0123-456789ABCDEF",
    //       funcId: "Poa002",
    //       shikibetsuCd: this.shikibetsuCd,
    //       userId: this.userId,
    //     }
    //   } as CommonRequest,
    //   this.cookie
    // );
    // const resText = await res.text();
    // const dom = this.parseTextToDOM(resText);
    // const form1TableBody = dom.getElementById("form1:htmlParentTable")?.children[0];
    // console.log(form1TableBody?.innerText.replaceAll("   ", "").replaceAll("	", "").replaceAll("\n\n", ""));
    // if (form1TableBody?.innerText === undefined) {
    //   console.log(dom.body.innerText.replaceAll("   ", "").replaceAll("	", "").replaceAll("\n\n", ""));
    //   throw new Error("Load Failed");
    // }
    // for (let i = 0; i == form1TableBody.children.length - 1; i++) {
    //   /*
    //    DOMメモ: カテゴリ
    //     - form1:htmlParentTable:${i}:htmlHeaderTbl:0:htmlHeaderCol
    //       - カテゴリタイトル
    //     - form1:htmlParentTable:${i}:htmlDetailTbl
    //       - 内容のテーブル
    //   */
    // }
    // return ;
  }

  getPortalURL() {
    const jsonData = {
      header: {
        shikibetsuCd: this.shikibetsuCd,
        deviceId: "i12345678-9ABC-4DEF-0123-456789ABCDEF",
        userId: this.userId,
      },
    };
    return (
      `${this.fetch.baseurl}/faces/up/ap/SmartphoneAppCommon?jsonData=` +
      encodeURI(JSON.stringify(jsonData))
    );
  }

  getSyllbusURL(classProperty: ClassProperty) {
    const jsonData = {
      "header": {
        "deviceId": "i12345678-9ABC-4DEF-0123-456789ABCDEF",
        "shikibetsuCd": this.shikibetsuCd,
        "userId": this.userId,
      },
      "option": {
        "sanshoTblFlg": "1",
        "nendo": classProperty.nendo,
        "jugyoCd": classProperty.jugyoCd,
        "buttonDsp": "0",
        "funcId": "Kms008",
        "formId": "pKms0804A",
      },
    };
    return `${this.fetch.baseurl}/faces/up/ap/SmartphoneAppCommon?jsonData=` +
      encodeURI(JSON.stringify(jsonData));
  }

  setCookie(authCookie: AuthCookie) {
    this.cookie = authCookie.cookie;
  }
}