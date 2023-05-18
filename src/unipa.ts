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
  /**
   * ログインステータス? \
   * "0": 仮ログイン
   * "1": パスワードがユーザーIDと同じ
   * "2": パスワードの有効期限切れ
   * "3": 仮パスワードでのログイン
   * それ以外: ユーザー情報の異常(パスワードが違うなど)
   */
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
    authProperty?: { userId: string; shikibetsuCd: string;},
  ) {
    this.fetch = new Fetch(baseurl);
    if (authProperty) {
      this.userId = authProperty.userId;
      this.shikibetsuCd = authProperty.shikibetsuCd;
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
    this.updateCookie(res);
    const resJson = (await res.json()) as { authResult: boolean };
    if (!resJson.authResult) {
      console.warn(resJson);
    }
    return resJson.authResult;
  }

  private updateCookie(response: Response) {
    if (response.headers.has("set-cookie")) {
      const cookies = response.headers
        .get("set-cookie")!
        .match(/JSESSIONID=.*?:-1;/g)!;
      this.cookie = cookies[cookies.length - 1];
    }
  }

  private wait(millisecond: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, millisecond)
    });
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

  async getKeijiList(showAll = true) {
    if (!await this.checkAuthStatus()) {
      throw new Error("Session Expired.");
    }
    const res = await this.fetch.getSmartphoneAPI(
      {
        option: {
          buttonDsp: "0",
        },
        header: {
          deviceId: "i12345678-9ABC-4DEF-0123-456789ABCDEF",
          funcId: "Poa002",
          shikibetsuCd: this.shikibetsuCd,
          userId: this.userId,
        },
      } as CommonRequest,
      this.cookie,
    );
    this.updateCookie(res);
    const resText = await res.text();
    const dom = this.parseTextToDOM(resText);
    const comSunFacesVIEW = this.getComSunFacesVIEW(dom);
    const form1TableBody =
      dom.getElementById("form1:htmlParentTable")?.children[0];
    if (form1TableBody?.innerText === undefined) {
      throw new Error("Load Failed");
    }

    const categoryInfos = [] as {
      title?: string;
      count: number;
      keiji: {
        unread: boolean;
        important: boolean;
        title?: string;
        from?: string;
        date?: unknown;
      }[];
    }[];

    for (let i = 0; i <= form1TableBody.children.length - 1; i++) {
      /*
       DOMメモ: カテゴリ
        - form1:htmlParentTable:${i}:htmlHeaderTbl:0:htmlHeaderCol
          - カテゴリタイトル
        - form1:htmlParentTable:${i}:htmlDetailTbl
          - 内容のテーブル
        - form1:htmlParentTable:${i}:htmlDisplayOfAll:0:htmlCountCol21702
          - 掲示数のカウント (/全(\d*)件/)
        - form1:htmlParentTable:${i}:htmlDisplayOfAll:0:allInfoLink
          - 「もっと見る」リンク
      */
      const categoryInfo = {
        title: form1TableBody.getElementById(
          `form1:htmlParentTable:${i}:htmlHeaderTbl:0:htmlHeaderCol`,
        )?.innerText,
        count: parseInt(
          (form1TableBody.getElementById(
            `form1:htmlParentTable:${i}:htmlDisplayOfAll:0:htmlCountCol21702`,
          )?.innerText.match(/全(\d*)件/) ?? [, "0"])[1],
        ),
        keiji: [] as {
          unread: boolean;
          important: boolean;
          title?: string;
          from?: string;
          date?: unknown;
        }[],
      };
      if (
        showAll &&
        form1TableBody?.getElementById(
          `form1:htmlParentTable:${i}:htmlDisplayOfAll:0:allInfoLink`,
        )
      ) {
        //TODO: ページングに対応する
        const res2 = await this.fetch.post("/faces/up/po/Poa00201Asm.jsp", {
          "com.sun.faces.VIEW": comSunFacesVIEW,
          [`form1:htmlParentTable:${i}:htmlDisplayOfAll:0:allInfoLinkCommand`]:
            "",
          "form1": "form1",
        }, this.cookie);
        this.updateCookie(res2);
        const res2Text = await res2.text();
        const dom2 = this.parseTextToDOM(res2Text);

        //「もっと見る」の画面ではhtmlDetailTbl2のみ
        const categoryDetailRows = dom2.getElementById(
          `form1:htmlParentTable:0:htmlDetailTbl2`,
        )?.children[1];
        for (let j = 0; j < categoryDetailRows?.children.length!; j++) {
          /*
            - form1:htmlParentTable:0:htmlDetailTbl2:${j}:htmlMidokul2
              - 未読かどうか
                ( * 既読の場合 * この要素があります)
            - form1:htmlParentTable:0:htmlDetailTbl2:${j}:htmlJuyo2
              - 重要かどうか
                ( * 重要でない場合 * この要素があります)
            - form1:htmlParentTable:0:htmlDetailTbl2:${j}:htmlTitleCol3
              - 掲示タイトル
            - form1:htmlParentTable:0:htmlDetailTbl2:${j}:htmlFromCol3
              - 送信者
            - form1:htmlParentTable:0:htmlDetailTbl2:${j}:htmlFromCol4
              - 掲示日時
          */
          categoryInfo.keiji.push({
            unread: !categoryDetailRows?.getElementById(
              `form1:htmlParentTable:0:htmlDetailTbl2:${j}:htmlMidokul2`,
            ),
            important: !categoryDetailRows?.getElementById(
              `form1:htmlParentTable:0:htmlDetailTbl2:${j}:htmlJuyo2`,
            ),
            title: categoryDetailRows?.getElementById(
              `form1:htmlParentTable:0:htmlDetailTbl2:${j}:htmlTitleCol3`,
            )?.getAttribute("title") ?? undefined,
            from: categoryDetailRows?.getElementById(
              `form1:htmlParentTable:0:htmlDetailTbl2:${j}:htmlFromCol3`,
            )?.innerText.replace("  ", "") ?? undefined,
            date: (categoryDetailRows?.getElementById(
              `form1:htmlParentTable:0:htmlDetailTbl2:${j}:htmlFromCol4`,
            )?.innerText.match(/\[(\d{4}\/\d{2}\/\d{2})\]/) ?? [,])[1] ??
              undefined,
          });
        }
        await this.fetch.post("/faces/up/po/Poa00201Asm.jsp", {
          "form1:htmlParentTable:0:htmlHeaderTbl:0:retrurn": "一覧表示",
          "form1:htmlParentTable:htmlDetailTbl2:web1__pagerWeb": "0",
          "com.sun.faces.VIEW": this.getComSunFacesVIEW(dom2),
          "form1": "form1"
        }, this.cookie)
      } else {
        const categoryDetailRows = form1TableBody.getElementById(
          `form1:htmlParentTable:${i}:htmlDetailTbl`,
        )?.children[0];
        for (let j = 0; j < categoryDetailRows?.children.length!; j++) {
          /*
            - form1:htmlParentTable:${i}:htmlDetailTbl:${j}:htmlMidokul
              - 未読かどうか
                ( * 既読の場合 * この要素があります)
            - form1:htmlParentTable:${i}:htmlDetailTbl:${j}:htmlJuyo
              - 重要かどうか
                ( * 重要でない場合 * この要素があります)
            - form1:htmlParentTable:${i}:htmlDetailTbl:${j}:htmlTitleCol1
              - 掲示タイトル
              - form1:htmlParentTable:${i}:htmlDetailTbl:${j}:htmlFromCol1
              - 送信者
                あと"０件です。"の表示が入ることがある
            - form1:htmlParentTable:${i}:htmlDetailTbl:${j}:htmlFromCol2
              - 掲示日時
          */
          if (
            categoryDetailRows?.getElementById(
              `form1:htmlParentTable:${i}:htmlDetailTbl:${j}:htmlTitleCol1`,
            )?.getAttribute("title") ?? undefined
          ) {
            categoryInfo.keiji.push({
              unread: !categoryDetailRows?.getElementById(
                `form1:htmlParentTable:${i}:htmlDetailTbl:${j}:htmlMidokul`,
              ),
              important: !categoryDetailRows?.getElementById(
                `form1:htmlParentTable:${i}:htmlDetailTbl:${j}:htmlJuyo`,
              ),
              title: categoryDetailRows?.getElementById(
                `form1:htmlParentTable:${i}:htmlDetailTbl:${j}:htmlTitleCol1`,
              )?.getAttribute("title") ?? undefined,
              from: categoryDetailRows?.getElementById(
                `form1:htmlParentTable:${i}:htmlDetailTbl:${j}:htmlFromCol1`,
              )?.innerText.replace("  ", "") ?? undefined,
              date: (categoryDetailRows?.getElementById(
                `form1:htmlParentTable:${i}:htmlDetailTbl:${j}:htmlFromCol2`,
              )?.innerText.match(/\[(\d{4}\/\d{2}\/\d{2})\]/) ?? [,])[1] ??
                undefined,
            });
          }
        }
      }
      categoryInfos.push(categoryInfo);
    }
    return categoryInfos;
  }

  async getKeijiDetail(categoryId: number, keijiId: number) {
    const res = await this.fetch.get(
      "/faces/up/po/pPoa0202Asm.jsp?fieldId=" +
        `dummy:form1:htmlParentTable:${categoryId}:htmlDetailTbl:${keijiId}:linkEx1`,
      this.cookie,
    );
    this.updateCookie(res);
    const resText = await res.text();
    const dom = this.parseTextToDOM(resText);
    const main = dom.getElementById("main");
    if (main?.innerText === undefined) {
      throw new Error("Load Failed");
    }
    /*
      DOMメモ: 掲示詳細画面
      - form1:htmlTitle
        - 件名
      - form1:htmlFrom
        - 差出人
      - form1:htmlMain
        - 本文
      - form1:htmlFileTable
        - 添付ファイル
    */
    const files = [] as { name: string, size: string, downloadFile: (cookie?: string) => Promise<Response>}[];
    if (main.getElementById("form1:htmlFileTable")) {
      const fileTableBody = main.getElementById("form1:htmlFileTable")?.children[0]!
      for (let i = 0; i < fileTableBody.children.length;i++) {
        const fileTableRow = fileTableBody.children[i];
        /*
          - form1:htmlFileTable:${i}:labelFileName
            - ファイル名
          - form1:htmlFileTable:${i}:labelFileSize
            - ファイルサイズ
          - form1:htmlFileTable:${i}:_id3
            - ダウンロードボタン要素のID
        */
        const serializedCookie = JSON.parse(JSON.stringify(this.cookie)) as string;
        files.push({
          name: fileTableRow.getElementById(`form1:htmlFileTable:${i}:labelFileName`)?.innerText!,
          size: fileTableRow.getElementById(`form1:htmlFileTable:${i}:labelFileSize`)?.innerText!,
          downloadFile: async (cookie?: string) => {
            const query = {
              "form1:htmlFileTable:0:_id3.x": "0",
              "form1:htmlFileTable:0:_id3.y": "0",
              "form1:htmlParentFormId": "",
              "form1:htmlDelMark": "",
              "form1:htmlRowKeep": "",
              "com.sun.faces.VIEW": this.getComSunFacesVIEW(dom),
              "form1": "form1"
            }
            return await this.fetch.get("/faces/up/po/pPoa0202Asm.jsp?" + new URLSearchParams(query).toString(), cookie ?? serializedCookie);
          }
        })
      }
    }
    return {
      title: main.getElementById("form1:htmlTitle")?.innerText,
      from: main.getElementById("form1:htmlFrom")?.innerText,
      body: main.getElementById("form1:htmlMain")?.innerHTML,
      files: files
    };
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

  _getSessionInfo() {
    return {
      userId: this.userId,
      shikibetsuCd: this.shikibetsuCd,
      cookie: this.cookie
    }
  }
}
