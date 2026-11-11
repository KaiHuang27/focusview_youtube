# Chrome Web Store 商品說明

商品 ID：`jbdndcjclbghkmbiehjigaapembpbgdb`。發布者：`af8ec36e-fc0d-47f9-b3fd-449dd85fd1c4`。

## 1.1.8：55 個語系（2026-11-11）

已補齊官方列出的 55 個 locale，涵蓋商店摘要與完整說明。`_locales/<locale>/messages.json` 提供安裝包摘要；本目錄的 UTF-8 `.txt` 提供後台完整說明。檔名以連字號取代 locale 的底線，例如 `pt_BR` 對應 `pt-BR.txt`。英文區域版本共用英文文案，西班牙文及葡萄牙文使用區域用語。產品名稱、操作介面仍為英文，未修改功能或權限，也未提交 Apple 更新。

官方 locale 清單：https://developer.chrome.com/docs/extensions/reference/api/i18n#locales 。此清單包含語言與地區代碼；實際後台可選項目應以上傳後畫面為準。

### 驗證與發布狀態

- 後台確認：1.1.7 已發布、公開（2026-11-11）；先前待審查紀錄已過時。
- 1.1.8：後台確認安裝包已上傳，草稿版本為 1.1.8、列出全部 55 個語系；已提交審查，尚未公開。
- 完整說明：新增的 50 個語系已逐一儲存，既有 5 個語系已確認；重新載入後再次切換全部 55 個語系，逐一比對欄位與本機翻譯內容，全部一致（忽略檔案尾端換行）。51 個非英文語系均為對應翻譯，4 個英文語系共用英文。
- 原因與修正：ZIP 僅啟用語系及本地化摘要，新增的完整說明先沿用英文；本次已另外填入並儲存對應 `.txt`，不再將套件上傳視為完整說明更新完成。
- 送審結果：後台顯示「你已將擴充功能提交審查」與「已提交商品。」；送出時「通過審查後自動發布」已勾選。公開版仍為 1.1.7，等待 Google 審查通過。
- 使用者已授權：上傳送審，通過後自動公開（DEFAULT_PUBLISH）。
- 測試：108 項通過，包含精確 55 個 locale、摘要長度及鍵值、完整說明基本完整性、數值與快捷鍵，以及 ZIP 收錄檢查。自動檢查不等同母語審校。
- 安裝包：`dist/focusview-1.1.8.zip`。
- SHA-256：`024ec718d5ae13b41759a51829a89209e42a13f0382a6a313ea14b50ac47f432`。
- 隱私政策：https://sites.google.com/view/focusview-privacy-policy 。維持不蒐集資料、僅 YouTube 存取、免費與原有發布區域設定。
- Safari 僅同步本機版本 1.1.8／build 9。

### 語系及完整說明

| Locale | 完整說明 |
| --- | --- |
| `am` | [am.txt](am.txt) |
| `ar` | [ar.txt](ar.txt) |
| `bg` | [bg.txt](bg.txt) |
| `bn` | [bn.txt](bn.txt) |
| `ca` | [ca.txt](ca.txt) |
| `cs` | [cs.txt](cs.txt) |
| `da` | [da.txt](da.txt) |
| `de` | [de.txt](de.txt) |
| `el` | [el.txt](el.txt) |
| `en` | [en.txt](en.txt) |
| `en_AU` | [en-AU.txt](en-AU.txt) |
| `en_GB` | [en-GB.txt](en-GB.txt) |
| `en_US` | [en-US.txt](en-US.txt) |
| `es` | [es.txt](es.txt) |
| `es_419` | [es-419.txt](es-419.txt) |
| `et` | [et.txt](et.txt) |
| `fa` | [fa.txt](fa.txt) |
| `fi` | [fi.txt](fi.txt) |
| `fil` | [fil.txt](fil.txt) |
| `fr` | [fr.txt](fr.txt) |
| `gu` | [gu.txt](gu.txt) |
| `he` | [he.txt](he.txt) |
| `hi` | [hi.txt](hi.txt) |
| `hr` | [hr.txt](hr.txt) |
| `hu` | [hu.txt](hu.txt) |
| `id` | [id.txt](id.txt) |
| `it` | [it.txt](it.txt) |
| `ja` | [ja.txt](ja.txt) |
| `kn` | [kn.txt](kn.txt) |
| `ko` | [ko.txt](ko.txt) |
| `lt` | [lt.txt](lt.txt) |
| `lv` | [lv.txt](lv.txt) |
| `ml` | [ml.txt](ml.txt) |
| `mr` | [mr.txt](mr.txt) |
| `ms` | [ms.txt](ms.txt) |
| `nl` | [nl.txt](nl.txt) |
| `no` | [no.txt](no.txt) |
| `pl` | [pl.txt](pl.txt) |
| `pt_BR` | [pt-BR.txt](pt-BR.txt) |
| `pt_PT` | [pt-PT.txt](pt-PT.txt) |
| `ro` | [ro.txt](ro.txt) |
| `ru` | [ru.txt](ru.txt) |
| `sk` | [sk.txt](sk.txt) |
| `sl` | [sl.txt](sl.txt) |
| `sr` | [sr.txt](sr.txt) |
| `sv` | [sv.txt](sv.txt) |
| `sw` | [sw.txt](sw.txt) |
| `ta` | [ta.txt](ta.txt) |
| `te` | [te.txt](te.txt) |
| `th` | [th.txt](th.txt) |
| `tr` | [tr.txt](tr.txt) |
| `uk` | [uk.txt](uk.txt) |
| `vi` | [vi.txt](vi.txt) |
| `zh_CN` | [zh-CN.txt](zh-CN.txt) |
| `zh_TW` | [zh-TW.txt](zh-TW.txt) |

### 後台套用流程

1. 上傳已驗證的 1.1.8 ZIP，確認套件版本與新增語系。
2. 逐一套用對應 `.txt` 完整說明，保留既有圖片、分類、政策、網站存取理由及發布區域。
3. 儲存並切換各語系驗證內容，再送審並選擇「通過後自動公開」。
4. 記錄實際送審狀態與公開顯示；不可將安裝包已上傳誤寫為完整說明已套用。

## 歷史紀錄：1.1.7

以下是當時的送審紀錄，不代表目前狀態。

狀態（2026-10-18）：1.1.7 已上傳，五種語言說明已儲存並逐一確認，已提交審查，後台顯示「待審查」。發布模式為通過後暫存（STAGED_PUBLISH），不會自動公開；通過後須於 30 天內發布。公開版本目前仍為 1.1.6。

- 測試：108 項通過，包含語系資料解析、摘要長度、完整說明功能一致性與 ZIP 語系檔封裝檢查。
- 程式提交：`aad59cd`。
- 安裝包：`dist/focusview-1.1.7.zip`。
- SHA-256：`6fd33983746a950ed30273de6cc5913652e8fb8b8531b9880f323582f9b1a15a`。
- 隱私政策：https://sites.google.com/view/focusview-privacy-policy 。後台既有不蒐集資料聲明、YouTube 網站存取理由、免費與所有區域公開設定均維持原狀。
- 英文完整說明不重複套件摘要，避免公開頁面首句重複。
- Safari 僅同步本地版本 1.1.7／build 8，未上傳或提交 Apple 審查。
- 送審畫面：[submitted-2026-10-18.png](submitted-2026-10-18.png)。

官方說明：https://developer.chrome.com/docs/webstore/cws-dashboard-listing
