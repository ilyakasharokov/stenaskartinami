// Always use production URL in emails — NEXTAUTH_URL is localhost in dev
const BASE_URL = process.env.SITE_URL || 'https://stenaskartinami.com'

const LOGO_BASE64 = 'data:image/svg+xml;base64,PHN2ZyBpZD0i0KHQu9C+0LlfMSIgZGF0YS1uYW1lPSLQodC70L7QuSAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MzkuNjEgNDQwLjY5Ij48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6IzFkMWQxYjtzdHJva2U6IzFkMWQxYjtzdHJva2UtbWl0ZXJsaW1pdDoxMDtzdHJva2Utd2lkdGg6M3B4O308L3N0eWxlPjwvZGVmcz48dGl0bGU+bG9nb19zdGVuYSBzIGthcnRpbmFtaTwvdGl0bGU+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNDA1LjgyLDI1My44MWMtNi40NS0xNy40Mi0xNC40NC0zNC0yNS4zOS00OS4xNHMtMjQuODctMjUtNDMuNDYtMjcuNDRjLTEyLjg2LTEuNjctMjUsLjg4LTM2LjYyLDcuMTYtMTkuNTIsMTAuNTEtMzIuNTcsMjctNDMuNTgsNDUuMzgtMTcuMzIsMjktMjksNjAuNC0zNy45Myw5Mi44NC0xLjM2LDQuOTItMi4xOCwxMC0zLjU4LDE0Ljg5LS4zOCwxLjM3LTEuODQsMy4yOS0yLjk1LDMuMzktMS41NS4xNC0zLjM3LTEtNC44MS0yLS44NC0uNTctMS4xNi0xLjkxLTEuNzQtMi44OS05LTE1LjE1LTE3LjQxLTMwLjc2LTI3LjMtNDUuMzQtMTEuMTctMTYuNDYtMjQuNzYtMzEtNDEuNDktNDIuMTQtMTUuNzEtMTAuNDUtMzIuMjEtOS44My00OC42NS0xLjc1LTEwLjcsNS4yNi0xOS43MywxMi44LTI3LjkzLDIxLjQ4QTI1Ni4xNCwyNTYuMTQsMCwwLDAsMjcuMSwzMTIuNjVWMjkyLjA4YzQuOTItNi41NCw5LjU2LTEzLjMzLDE0LjgyLTE5LjU5LDEyLjQ3LTE0LjgyLDI2LjUyLTI3Ljg1LDQzLjg2LTM3LDE4LjQtOS42OCwzNi40MS05LjIsNTQuMjEsMS42NiwyMC40NCwxMi40NiwzNS41OSwzMC4wOSw0OC42OSw0OS42OCw2LjI1LDkuMzUsMTIsMTksMTguMDYsMjguNTIuNzUsMS4xOCwxLjU1LDIuMzMsMyw0LjQ1YTY2LjM0LDY2LjM0LDAsMCwwLDIuNzktNi4wN2M1Ljk1LTE3LjYsMTEuNDQtMzUuMzYsMTcuODMtNTIuNzksMTAuNDItMjguNDIsMjUtNTQuMzgsNDgtNzQuNzQsMTMuOS0xMi4zNCwyOS45MS0yMSw0OC44NS0yMi4yNCwxNy41LTEuMTMsMzIuNTksNS42MSw0NS45MSwxNi40NiwxNy43MiwxNC40MywyNy43LDM0LDM1Ljk0LDU0LjczYTM0LjE3LDM0LjE3LDAsMCwwLDMuNTEsNy4wNiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI1MS4zOSwxMzAuOTRjLTEuNzQsMTguNzktOS4zNCwzOS4yNy0zMC45LDUxLjQyLTM0LDE5LjE1LTgwLjIyLjI2LTg3Ljg0LTQwLjI4QzEyOSwxMjIuNzcsMTMxLDEwNC41NCwxNDMsODguNTljMjIuMTQtMjkuMzYsNjYuMzMtMzUuNjMsOTIuNzQtNC4xN0MyNDUuNzYsOTYuMzQsMjUxLjU0LDExMC4zNCwyNTEuMzksMTMwLjk0Wm0tNTksNDguNDYuMywxYzUuOTMtMS40NywxMi4wOC0yLjM2LDE3Ljc1LTQuNTIsMjMuMjctOC44NSwzNS40My0zMi42OSwzMS43NS01Ny43OC0zLjE2LTIxLjYyLTE2LjA3LTM2LjIyLTM3LTQyLjU3LTE3LjIzLTUuMjItMzMuNjUtMy00Ny40MSw5LjZhNTMuNjIsNTMuNjIsMCwwLDAtMTcuMTcsMzMuNGMtMiwxNC40NC40MSwyNy45MSw4LjU0LDM5Ljk0QzE1OS4zMywxNzMuNzEsMTc0LjU4LDE3OS4zNiwxOTIuMzQsMTc5LjRaIi8+PC9zdmc+'

export function emailHtml({ title, preheader, body }) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${title}</title>
<!--[if mso]><style>td,th,div,p,a,h1,h2,h3,h4,h5,h6{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f5f3f0;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">

<!-- preheader (hidden preview text) -->
<span style="display:none;font-size:1px;color:#f5f3f0;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</span>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f3f0;padding:28px 16px 40px">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px">

        <!-- HEADER -->
        <tr>
          <td style="padding-bottom:20px" align="center">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;padding-right:10px">
                  <a href="${BASE_URL}" style="text-decoration:none;display:block">
                    <img src="${LOGO_BASE64}"
                         alt="Стена с картинами"
                         width="44" height="44"
                         style="display:block;border:0;width:44px;height:44px;object-fit:contain" />
                  </a>
                </td>
                <td style="vertical-align:middle">
                  <a href="${BASE_URL}" style="text-decoration:none;font-size:15px;font-weight:700;color:#1a1a1a;letter-spacing:1.5px;text-transform:uppercase;white-space:nowrap">
                    Стена с картинами
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY CARD -->
        <tr>
          <td style="background:#ffffff;border-radius:14px;border:1px solid #e8e2da;overflow:hidden">
            <!-- orange top bar -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="background:#e8721a;height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>
            </table>
            <!-- content -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:36px 40px 40px">
                  ${body}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding-top:28px">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <!-- social links -->
              <tr>
                <td align="center" style="padding-bottom:14px">
                  <a href="https://www.instagram.com/stena_s_kartinami/" target="_blank"
                     style="display:inline-block;margin:0 8px;padding:6px 16px;border:1px solid #ddd;border-radius:20px;font-size:12px;color:#555;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif">
                    Instagram
                  </a>
                  <a href="https://www.facebook.com/stenaskartinami/" target="_blank"
                     style="display:inline-block;margin:0 8px;padding:6px 16px;border:1px solid #ddd;border-radius:20px;font-size:12px;color:#555;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif">
                    Facebook
                  </a>
                </td>
              </tr>
              <!-- links -->
              <tr>
                <td align="center" style="padding-bottom:8px">
                  <a href="${BASE_URL}/privacy-policy" style="color:#999;font-size:12px;text-decoration:none;margin:0 8px">Политика конфиденциальности</a>
                  <span style="color:#ccc;font-size:12px">·</span>
                  <a href="${BASE_URL}/remove-data" style="color:#999;font-size:12px;text-decoration:none;margin:0 8px">Удаление данных</a>
                </td>
              </tr>
              <!-- copyright -->
              <tr>
                <td align="center">
                  <span style="color:#bbb;font-size:11px">© ${new Date().getFullYear()} stenaskartinami.com</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`
}

export function otpEmailHtml(code) {
  return emailHtml({
    title: 'Код подтверждения — Стена с картинами',
    preheader: `Ваш код: ${code}`,
    body: `
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3">Вход в аккаунт</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#666;line-height:1.6">
        Используйте этот код для входа на сайт «Стена с картинами». Никому его не сообщайте.
      </p>

      <!-- OTP block -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px">
        <tr>
          <td align="center"
              style="background:#f7f5f2;border-radius:10px;padding:24px 20px">
            <div style="font-size:42px;font-weight:800;letter-spacing:14px;color:#1a1a1a;font-family:'Courier New',Courier,monospace">${code}</div>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;color:#999;line-height:1.6">
        Код действителен <strong style="color:#666">10 минут</strong>.<br>
        Если вы не запрашивали вход — просто проигнорируйте это письмо.
      </p>
    `,
  })
}
