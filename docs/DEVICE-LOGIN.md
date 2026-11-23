# 同一裝置快速登入：評估與設定

2026-11-23 查閱 Cloudflare 官方 session 文件。這是設定建議，尚未代為修改帳號的 Access 設定，也未用真實帳號測量跨日登入。

## 建議：保留登入 7 天

現有私人網站已使用 Cloudflare Access，成功登入後，同一瀏覽器會用 Access Cookie 直接進站；有效期內不用每次收 Email 驗證碼。最適合目前單人、手機／iPad／電腦用途的做法，是調整現有工作階段期限，無須新增網站帳密或自製裝置辨識。

1. 開啟 [Cloudflare 控制台](https://dash.cloudflare.com/)，進入 **Zero Trust → Access controls → Applications**（部分介面顯示 Access → Applications）。
2. 找到網域為 **finance-school.alexchen109.workers.dev** 的 application，按 **Edit → Overview → Session Duration**，選 **7 days／一週**，儲存。
3. 檢查這個 application 允許本人 Email 的 **Allow policy**。將該政策的 **Session Duration** 設為 **Same as application**；若政策另設較短期限，會優先採用政策設定。政策也可從 **Access controls → Policies** 編輯。保留原本只允許本人 Email 的條件。
4. 設定後在每台裝置各登入一次，再於同一瀏覽器重開 [私人網站](https://finance-school.alexchen109.workers.dev/)。新的期限用於新核發的 application token；舊 token 不一定立即變更。

若希望 global SSO 工作階段也保留 7 天，可在 **Access controls → Access settings → Set your global session duration** 設為 **7 days**。這是組織層級設定，影響其他 Access applications。Global token 有效時可免再輸入驗證碼換發已到期的 application token；現有 application token 有效時可直接使用。若啟用 Cloudflare One Client／其他 MFA，另有優先期限，不可只依 application 設定推斷。

Cloudflare 官方允許 application、policy 與 global 期限最長一個月。自用裝置建議先用 7 天；需要更久時可選一個月。設定期限會延長持有有效 Cookie 的人能存取網站的時間，裝置遺失時可在 Access 撤銷 session。

## 手機與平板注意事項

- 一律使用私人 Worker 網址；公開 GitHub Pages 不會因此取得私人行情。
- 同一裝置的 Safari、Chrome、App 內建瀏覽器通常各有自己的 Cookie；各需登入一次。避免無痕模式或自動清除網站資料。關閉一般分頁再開啟，通常仍可使用未過期的 Cookie。
- 可先在 Safari 登入，再將私人網站加入主畫面作捷徑。主畫面與原瀏覽器是否共用登入，需依實際 iOS／瀏覽器版本測試，不能保證跨容器沿用。
- 主動「登出」、清除 Cookie、管理者撤銷 session、期限屆滿後仍需重新驗證；不保證永久登入。
- 每台裝置登入相同 Email 後，既有自選股雲端同步繼續使用。

## 其他選項

| 做法 | 評估 |
| --- | --- |
| 現有 Email PIN + 保留 Cookie | 建議先採用；無新增帳密或外部憑證 |
| Google 等身分提供者 SSO | 日後可選；需要新增 IdP、OAuth 應用與對應政策，不能只由 React 開啟 |
| Passkey／Face ID／Touch ID | 取決於所接身分提供者與裝置；現有 Email PIN 不等於已支援生物辨識登入 |
| 瀏覽器儲存 API Key、PIN 或永久存取 Token | 不採用；會改變既有後端保密與授權方式 |

本次不變更 Access 或 Worker 身分驗證。沒有 Cloudflare 管理權限工具，無法讀取目前 application／policy 的真實期限；控制台設定與真實裝置的跨日有效期由本人驗收。

## 官方依據

- [Session management：期限範圍、application／policy／global 優先順序、撤銷與登出](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)
- [One-time PIN](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)
- [既有私人雲端設定](EMAIL-ACCESS-CLOUD.md)
