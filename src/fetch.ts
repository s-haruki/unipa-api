export default class UNIPAFetch {
  /** UNIPAにアクセスする時のベースURL */
  baseurl;
  constructor(baseurl: string) {
    this.baseurl = baseurl;
  }

  /**
   * UNIPAのAPIをたたきます
   * @param body    送信するjson(jsonData)
   * @param cookie  クッキー
   */
  async getSmartphoneAPI(body: Record<string, unknown>, cookie?: string) {
    return await this.get(
      `/faces/up/ap/SmartphoneAppCommon?jsonData=` +
        encodeURI(JSON.stringify(body)),
      cookie,
    );
  }

  /** UNIPAにPOSTを送ります
   *  @param url    送信先のURL('~/up'以降)
   *  @param body   HTMLフォーム形式のbody
   *  @param cookie 送信するCookie
   */
  async post(
    url: string,
    body: Record<string, string> | string,
    cookie?: string,
  ): Promise<Response> {
    //bodyをHTMLフォーム形式にエンコード
    const params = new URLSearchParams(body);
    const request = new Request(`${this.baseurl}${url}`, {
      body: params,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": params.toString().length.toString(),
        "Cookie": cookie ?? "",
        "Referer": this.baseurl,
      },
      keepalive: true,
    });
    return await fetch(request);
  }

  /** UNIPAにGETを送ります
   *  @param url    送信先のURL('~/up'以降)
   *  @param cookie 送信するCookie
   */
  async get(url: string, cookie?: string) {
    return await fetch(`${this.baseurl}${url}`, {
      method: "GET",
      headers: {
        Cookie: cookie ?? "",
        "User-Agent": "UNIPA/1.1.25 UNIPA-API-SERVER/0.0.1",
      },
    });
  }
}
