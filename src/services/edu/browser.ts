import type { Course } from '@/models/course';
import { SCHEDULE_DATA } from '@/services/edu/client';
import { parseScheduleJson } from '@/services/edu/parser';

/**
 * 「从浏览器中获取」：用户在 WebView 内登录教务并打开课表页后，注入本脚本，
 * 同源调用课表 JSON 接口（会话 Cookie 自动附带），把原始 JSON 文本回传给 RN。
 */
export const SCRAPE_SCRIPT = `(function () {
  function post(obj) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }
  }
  function pick(sel) {
    var el = document.querySelector(sel);
    return el && el.value ? el.value : '';
  }
  try {
    var xnm = pick('select#xnm');
    var xqm = pick('select#xqm');
    if (!xnm || !xqm) {
      var d = new Date();
      var y = d.getFullYear();
      var m = d.getMonth() + 1;
      if (m >= 8) { xnm = String(y); xqm = '3'; }
      else if (m === 1) { xnm = String(y - 1); xqm = '3'; }
      else { xnm = String(y - 1); xqm = '12'; }
    }
    var body = 'xnm=' + encodeURIComponent(xnm) +
      '&xqm=' + encodeURIComponent(xqm) +
      '&kzlx=ck&xsdm=';
    fetch('${SCHEDULE_DATA}', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: body
    }).then(function (r) { return r.text(); }).then(function (text) {
      post({ type: 'schedule', payload: text });
    }).catch(function (e) {
      post({ type: 'error', message: String((e && e.message) || e) });
    });
  } catch (e) {
    post({ type: 'error', message: String(e) });
  }
})();`;

/**
 * 把 WebView 回传的课表 JSON 文本解析为 Course[]。
 * 文本不是合法 JSON（例如登录失效被重定向回 HTML 登录页）时返回 null。
 */
export function parseBrowserPayload(text: string, totalWeeks: number): Course[] | null {
  try {
    return parseScheduleJson(JSON.parse(text), totalWeeks);
  } catch {
    return null;
  }
}
