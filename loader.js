// 작품 선택 로더: works/works.js 의 작품 목록에서 이번에 열 작품을 정하고, 그 작품의 data/index.js 를 불러온다.
// 우선순위: 주소의 ?work=<작품ID> → 마지막으로 연 작품 → 목록의 첫 작품
(function loadWork() {
  const works = window.PROJECT_H_WORKS || [];
  let id = new URLSearchParams(window.location.search).get('work');
  try { id = id || window.localStorage.getItem('project_h_work'); } catch { /* 저장소 사용 불가 시 무시 */ }
  const work = works.find((item) => item.id === id) || works[0] || null;
  window.PROJECT_H_WORK = work ? { ...work, path: `works/${encodeURIComponent(work.id)}` } : null;
  if (!work) return;
  try { window.localStorage.setItem('project_h_work', work.id); } catch { /* 무시 */ }
  // 파서가 멈춰서 순서대로 읽도록 document.write 사용 (app.js 가 실행되기 전에 데이터가 있어야 함)
  document.write(`<script src="${window.PROJECT_H_WORK.path}/data/index.js"><\/script>`);
}());
