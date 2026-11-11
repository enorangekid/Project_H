# Project_H 통합관리

스크립트 기반 연애 시뮬레이션 게임의 **대사·녹음 대본·음성 검수 상태를 씬 단위로 관리**하는 정적 웹 페이지입니다. 여러 작품을 한 곳에서 다루며, 현재 작품은 `seohee`(가제)입니다.

> 다음 작업자(AI)는 이 문서만 읽고 바로 시작할 수 있도록 적었습니다.

## 만든 의도

- 원래 엑셀 한 파일로 대사·대본을 관리했고, 번역·수정을 AI에게 맡길 때마다 엑셀 전체를 읽히고 다시 쓰게 해서 **시간과 토큰이 많이 들었습니다.**
- 만든 음성 파일이 많아져서 **특정 대사의 음성을 바로 찾아 확인하기 어려웠습니다.**
- 장기적으로 이 데이터를 게임 제작에도 쓸 예정입니다.

## 작업 방식 (중요)

- **수정은 전부 AI가 합니다.** 사용자는 페이지로 보고, 대화로 수정을 요청하고, 결과를 확인만 합니다. 흐름은 **요청 → AI가 바로 적용 → 사용자가 대사집 화면과 채팅으로 확인 → 이상하면 "되돌려줘"** 입니다. 승인 단계와 별도의 변경 내역 화면은 없습니다. 페이지의 직접 편집 기능은 보조입니다.
- AI는 파일을 통째로 읽지 말고 **`tools/scene.js`로 필요한 씬·필드만 읽고, 바뀐 행만 반영**하세요. 엑셀을 다시 쓰지 않습니다.
- 수정할 때는 **항상 `set`을 쓰고 `--note "수정 사유"`를 붙이세요.** 수정 전·후가 `data/changes/`에 자동 기록되어 `revert`로 정확히 되돌릴 수 있습니다(수정 전·후 내용은 `log --detail`로 확인). 파일을 직접 고치면 기록이 남지 않습니다.
- 사용자가 어느 행인지 알려줄 때는 페이지의 `참조 복사` 결과를 붙여넣습니다. 형식은 `N1 · 행 22 · 01姉_00_01.ks#22` 입니다 (`행`은 엑셀 행 번호, 마지막이 `id`). `--ids`에는 마지막 `id`를 쓰세요. 되돌릴 때는 `revert <씬ID> --last` 또는 `log`에서 찾은 `--batch <묶음ID>`를 씁니다.
- 사용자는 집과 회사 PC를 오가며 작업합니다. **대본 데이터만 GitHub**에 올리고, **음성·CG는 집 PC에만** 둡니다(저장소에 올리지 않음). 회사에서는 대본 수정 요청과 검수만 합니다.

## 폴더 구조

```
index.html, app.js, styles.css, loader.js   페이지 (모든 작품 공용)
works/
  works.js                 작품 목록 (tools/work.js sync 로 자동 생성)
  seohee/                  작품 폴더
    work.json              작품 ID·표시 이름
    data/index.js          메타, 화자 목록, 씬 목록(종류·설명·단계·진행 통계)
    data/scenes/<씬ID>.js  씬별 행 목록 (한 줄에 한 행) — N1~N37 일반씬, H1~H23 행위씬, 총 60개
    data/changes/<씬ID>.js 씬별 AI 변경 기록 (수정 전·후, 도구가 자동 생성 — 수정이 생기면 만들어짐)
    data/script-data.js    분리 전 원본 한 덩어리 파일 (페이지는 읽지 않음, 확인 후 삭제 가능)
tools/                     조회·수정·작품 관리 도구 (Node.js)
```

- 행 필드: `rowNumber`(엑셀 행 번호), `id`(`파일명.ks#줄번호`, 작품 안에서 고유), `kind`, `speaker`, `english`, `korean`, `recordingScript`, `memo`, `voice`(✓ = 음성 체크), `phaseId`
- 씬 종류·설명·단계명·단계 상세는 `index.js`의 씬 정보에 한 번만 저장됩니다.
- `seohee`: 검수본 `translated_script_final_20261110_h10_h12_rechecked.xlsx` 기준 10,917행, 60개 씬.

## 사용법

### 페이지 보기
`index.html`을 브라우저로 열면 됩니다(서버 불필요). 상단 `작품` 목록으로 작품을 바꾸고, 씬을 고르면 그 씬 파일만 불러옵니다. 주소에 `?work=<작품ID>`를 붙여도 됩니다. 페이지의 직접 수정은 작품별로 이 브라우저에만 저장됩니다.

- **참조 복사:** 행을 선택하면 상세 패널 맨 위에 `N1 · 행 22 · <id>`가 보이고, `참조 복사`를 누르면 클립보드에 복사됩니다. AI에게 어느 행인지 알려줄 때 붙여넣습니다(대사 본문은 복사되지 않음).
- **영어 원문 열은 기본으로 숨김**이고, 필터 줄의 `영어 원문 표시`를 켜면 표와 행 상세에 나타납니다(선택은 이 브라우저에 기억됨). 한국어 대사가 가장 넓게 표시되며, 숨겨진 열은 검색 대상에서도 제외됩니다. 일본어 원문 열이 생기면 `app.js`의 `fields`와 `SOURCE_COLUMNS`에 추가하면 같은 방식으로 숨김·표시됩니다.
- AI가 수정한 내용을 반영하려면 페이지를 새로고침하세요. (수정 전·후 비교 화면은 없습니다. 필요하면 GitHub Desktop의 변경 비교를 쓰세요.)

### AI·작업자용 도구
작품이 하나뿐이면 `--work`를 생략할 수 있고, **둘 이상이면 반드시 지정**해야 합니다.

```bash
node tools/scene.js --work seohee list                                   # 씬별 행 수·진행률
node tools/scene.js --work seohee get N1 --fields id,korean --limit 20   # 필요한 필드만 조회
node tools/scene.js --work seohee get N1 --empty korean --fields id,english   # 한국어가 빈 행
node tools/scene.js --work seohee get H3 --from 3000 --to 3100 --tsv     # 엑셀 행 번호 범위
node tools/scene.js --work seohee set N1 patch.json --dry                # 수정 미리 검증 (파일 변경 없음)
node tools/scene.js --work seohee set N1 patch.json --note "말투 통일"    # 바뀐 행만 반영 + 수정 사유 기록
node tools/scene.js --work seohee log N1                                 # 변경 묶음 목록 (본문 없이 요약)
node tools/scene.js --work seohee revert N1 --last                       # 가장 최근 변경 되돌리기
node tools/scene.js --work seohee revert N1 --batch b20261111-130500 --ids <id1,id2>   # 특정 묶음(의 일부 행) 되돌리기
```

- `patch.json`: `[{"id":"…","korean":"수정한 대사"}, …]` — 바뀐 필드만 적습니다.
- 수정 가능 필드: `kind`, `speaker`, `english`, `korean`, `recordingScript`, `memo`, `voice`. `id`·`rowNumber`·`phaseId`와 씬 정보는 바꿀 수 없고, 잘못된 ID나 필드가 하나라도 있으면 **아무것도 적용하지 않습니다.**
- 반영하면 변경 기록이 남고(`set` 결과의 `batch`가 묶음 ID), `index.js`의 개수·진행 통계가 자동으로 다시 계산됩니다.
- `revert`는 기록의 수정 전 값으로 복구합니다. 그 뒤에 다른 수정이 있었던 항목은 건드리지 않고 `conflicts`로 알려주며, 일부만 되돌려진 묶음은 `--last`로 남은 항목을 다시 되돌릴 수 있습니다. `--dry`로 미리 확인할 수 있습니다.
- `log`는 기본적으로 본문 없이 요약만 출력합니다(`--detail`을 줘야 수정 전·후가 나옴).

### 작품 추가
```bash
node tools/work.js new <작품ID> "<표시 이름>"                       # 폴더 생성 + 작품 목록 갱신
node tools/split.js --work <작품ID> <원본 script-data.js 경로>      # 씬별 파일로 분리 (원본과 동일한지 자동 검증)
node tools/work.js list                                             # 등록된 작품 확인
```
작품 ID는 영문·숫자·`_`·`-`만 가능하며 폴더 이름이 됩니다.

## 앞으로 할 일 (순서대로)

1. ~~수정 요청·검수~~ — **완료(단순화).** 승인 단계와 변경 내역 화면 없이, AI가 바로 적용하고 변경 기록·`revert`·행 참조 복사로 처리합니다
2. ~~엑셀 내보내기~~ — 필요 없다고 판단하여 하지 않음
3. **음성·CG 연결** — 집 PC에서 폴더를 한 번 연결하면 대사 ID로 찾아 재생·표시, ✓ 체크와 실제 파일 대조. 음성 파일 이름 규칙은 원작 스크립트 기준이며 아직 확인 전
4. **게임용 출력** — 씬 단위 JSON 등 (게임 엔진은 미정)

## 아이디어 메모 (미구현)

- **자동 재생 검수:** 대사·CG·음성이 갖춰지면 게임을 직접 실행하지 않고도 씬을 자동으로 재생해서, 작업이 제대로 됐고 잘 어울리는지 확인하는 기능. (검수용 아이디어이며 아직 설계·구현 전)
- **자동 점검:** 음성 체크(✓)와 실제 파일의 일치 여부, 파일 이름·ID 연결 오류, 음성 길이 이상, CG 누락 등을 목록으로 알려주는 기능.

## 저장소·환경 메모

- 음성·CG 폴더는 `.gitignore`로 제외됩니다 (`voice/`, `audio/`, `cg/`). 실제 폴더 이름이 다르면 추가하세요.
- Windows PC에서 `git`이 PATH에 없을 수 있습니다. GitHub Desktop 안의 git(`%LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git\cmd\git.exe`)을 쓰세요. 폴더 소유자가 달라 "dubious ownership" 오류가 나면 전역 설정을 바꾸지 말고 명령마다 `-c safe.directory=<경로>`를 주세요.
- 검색 엔진 수집 방지를 위해 `noindex` 메타 태그가 적용되어 있습니다.
