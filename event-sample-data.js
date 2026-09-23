(function () {
  const transactionSamples = [
    ["D0", "BXM", "RSMDE1842A01", "비대면 수신 계좌 개설", "BXM30011", "거래 처리도중 오류가 발생했습니다.", "solwa01p", "디지털수신셀", "디지털뱅킹_국내", "Mobile수신"],
    ["D0", "BXM", "RSMDE1842A01", "비대면 수신 계좌 개설", "BXM40101", "업무처리중 오류가 발생했습니다.", "dtnwa21p", "디지털수신셀", "디지털뱅킹_국내", "Mobile수신"],
    ["D0", "BXM", "RSMDE1842A01", "비대면 수신 계좌 개설", "BXM30002", "거래 처리 중 일시적인 지연이 발생했습니다.", "solwa03p", "디지털수신셀", "디지털뱅킹_국내", "Mobile수신"],
    ["D0", "BXM", "RSMDE6284A01", "수신 상품 가입", "BXM40101", "업무처리중 오류가 발생했습니다.", "solwa05p", "디지털수신셀", "디지털뱅킹_국내", "Mobile수신"],
    ["DT", "BXM", "RSMDE8507A01", "연결 기관 목록 조회", "BXM30002", "거래 처리 중 일시적인 지연이 발생했습니다.", "dtnwa25p", "마이데이터셀", "디지털뱅킹_국내", "Mobile공통"],
    ["DX", "BXM", "RSMDE5873A01", "대출 약정 정보 저장", "BXM40101", "업무처리중 오류가 발생했습니다.", "dtnwa22p", "디지털여신셀", "디지털뱅킹_국내", "Mobile수신"],
    ["A1", "PFM", "GSSDD2704A01", "자동화기기 출금 승인", "PFM03030", "서비스 타임아웃이 발생했습니다", "coreap1p", "수신개발셀", "N수신", "유동성"],
    ["A1", "PFM", "GSSDD2704A01", "자동화기기 출금 승인", "DEP10051", "원장 처리시 오류입니다. 전산담당자에게 문의하세요", "coreap2p", "수신개발셀", "N수신", "정기성"],
    ["A1", "PFM", "GSTYJ9140A01", "자동화기기 입금 처리", "DEP10051", "원장 처리시 오류입니다. 전산담당자에게 문의하세요", "coreap3p", "외환개발셀", "N외국환", "무역외 업무공통"],
    ["A0", "PFM", "GSSDD4632A01", "고객 정보 변경", "PFM03030", "서비스 타임아웃이 발생했습니다", "coreap4p", "여신개발셀", "N여신", "개인상담신청"]
  ];
  const statuses = ["미조치", "미조치", "미조치", "조치중", "결재요청", "조치완료"];
  const ownerByErrorKey = {
    "RSMDE1842A01::BXM30011": "김민준",
    "RSMDE1842A01::BXM40101": "이서연",
    "RSMDE1842A01::BXM30002": "박도윤",
    "RSMDE6284A01::BXM40101": "최지우",
    "RSMDE8507A01::BXM30002": "정하늘",
    "RSMDE5873A01::BXM40101": "오지훈",
    "GSSDD2704A01::PFM03030": "문태경",
    "GSSDD2704A01::DEP10051": "신예린",
    "GSTYJ9140A01::DEP10051": "장서우",
    "GSSDD4632A01::PFM03030": "유나영"
  };
  const actionTypes = ["", "프로그램수정", "DB조치", "시스템설정", "그외조치", "원인불명", "외부기관응답지연", "타시스템응답지연", "조치대상아님"];
  const actionContents = [
    "서비스 로그 확인 후 재처리 대상 건을 분리했습니다.",
    "원장 응답 지연 구간을 확인하고 업무 담당자에게 확인 요청했습니다.",
    "배치 반영 설정값 확인 후 재기동 일정을 조율 중입니다.",
    "일시 지연으로 판단되어 동일 거래 재발생 여부를 모니터링 중입니다.",
    "외부 응답 전문 지연으로 확인되어 기관 응답 상태를 추적 중입니다."
  ];

  function pad(value, size) {
    return String(value).padStart(size, "0");
  }

  function makeGlobalId(index) {
    return `${pad(2026060900000000 + index * 731, 16)}${pad(8100000000000000 + index * 193, 16)}`;
  }

  function makeOccurredAt(index) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(index / 40));
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(date);
  }

  function makeDate(index, offset) {
    const day = 10 + ((index + offset) % 12);

    return `2026-06-${pad(day, 2)}`;
  }

  function makeAppliedAt(sampleIndex) {
    const day = 1 + (sampleIndex % 8);
    const hour = 20 + (sampleIndex % 3);
    const minute = (sampleIndex * 7) % 60;

    return `2026-06-${pad(day, 2)} ${pad(hour, 2)}:${pad(minute, 2)}`;
  }

  function getFailureCause(errorCode) {
    if (errorCode === "PFM03030") {
      return "서비스 응답 제한시간 초과";
    }

    if (errorCode === "DEP10051") {
      return "원장 처리 예외";
    }

    if (errorCode === "BXM30002") {
      return "일시적 거래 지연";
    }

    return "업무 처리 중 예외 발생";
  }

  function makeSourceLocation(transactionCode, errorCode, sampleIndex) {
    const moduleName = transactionCode.slice(0, -2).toLowerCase();

    return [
      `/app/itsm/channel/${moduleName}/service/${moduleName}Service.java:${120 + sampleIndex * 7}`,
      `/app/itsm/channel/${moduleName}/mapper/${moduleName}ErrorMapper.xml:${40 + sampleIndex * 3}`,
      `errorCode=${errorCode}, transactionCode=${transactionCode}`
    ].join("\n");
  }

  function getDepartment(channelType, businessGroup) {
    if (channelType.startsWith("D")) {
      return "디지털서비스개발부";
    }

    if (businessGroup === "N수신") {
      return "금융서비스개발부";
    }

    if (businessGroup === "N여신") {
      return "여신서비스개발부";
    }

    return "투자서비스개발부";
  }

  // Different bucket sizes and pattern distributions for a presentation.
  const scenarios = [
    { days: 0, sample: 0, counts: [7, 3, 2] },
    { days: 0, sample: 3, counts: [5] },
    { days: 0, sample: 1, counts: [2, 1] },
    { days: 0, sample: 6, counts: [4, 2, 1, 1] },
    { days: 1, sample: 0, counts: [8, 3, 1] },
    { days: 1, sample: 3, counts: [6] },
    { days: 1, sample: 1, counts: [5, 2] },
    { days: 1, sample: 6, counts: [9, 4, 2, 1] },
    { days: 2, sample: 0, counts: [3, 2] },
    { days: 2, sample: 4, counts: [11] },
    { days: 2, sample: 7, counts: [4, 3, 2] }
  ];
  const patterns = [
    ["필수 입력값 누락", "validateAccount", 142],
    ["외부기관 응답시간 초과", "requestExternal", 287],
    ["필수 입력값 누락", "validateCustomer", 356],
    ["응답 전문 파싱 실패", "parseResponse", 421]
  ];
  const dateFor = days => {
    const base = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul'}).format(new Date());
    const d = new Date(base + 'T12:00:00+09:00'); d.setUTCDate(d.getUTCDate() - days);
    return new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul'}).format(d);
  };
  window.EVENT_SEARCH_ROWS = [];
  scenarios.forEach((scenario, scenarioIndex) => {
    const sample = transactionSamples[scenario.sample];
    scenario.counts.forEach((count, patternIndex) => {
      const pattern = patterns[patternIndex];
      const source = `/app/service/${sample[2]}.java:${pattern[2]} (${pattern[1]})`;
      for (let i = 0; i < count; i++) {
        const no = window.EVENT_SEARCH_ROWS.length + 1;
        const date = dateFor(scenario.days);
        const occurredAt = `${date} ${pad(9 + (i % 3), 2)}:${pad((no * 3) % 60, 2)}:${pad(no % 60, 2)}`;
        const ready = scenario.days > 0 && patternIndex === 0 && i < 3;
        const normalizedError = `${pattern[0]} | ${source} | requestId=<ID> elapsed=<N>ms`;
        window.EVENT_SEARCH_ROWS.push({
          no, rawId: `${date}-S${scenarioIndex}-P${patternIndex}-${i}`,
          globalId: `${date.replaceAll('-', '')}${pad(no,24)}`,
          occurredAt, registeredAt: occurredAt,
          status: ready ? '조치중' : '미조치', stage: ready ? '조치예정' : '미조치',
          errorType: sample[1], channelType: sample[0], transactionCode: sample[2],
          transactionName: sample[3], errorCode: sample[4], errorMessage: sample[5],
          errorDetailMessage: `${pattern[0]} | ${source} | requestId=REQ${pad(no,6)} elapsed=${120 + no * 17}ms`,
          normalizedError: scenario.days ? normalizedError : null,
          batchGroupId: scenario.days ? JSON.stringify([date,sample[2],sample[4],normalizedError]) : null,
          batchProcessedAt: scenario.days ? `${dateFor(scenario.days - 1)} 00:10:00` : null,
          sourceLocation: source, hostName: sample[6], cell: sample[7],
          department: getDepartment(sample[0], sample[8]), owner: ownerByErrorKey[`${sample[2]}::${sample[4]}`],
          businessGroup: sample[8], business: sample[9], serviceName: sample[2].slice(0,-2),
          programDescription: `${sample[3]} 처리 프로그램`, recentAppliedAt: `${dateFor(3)} 20:00`,
          failureCause: pattern[0], duplicateCount: 1, part: '디지털수신', lastActor: '구민준',
          store: '1042', pid: String(18000 + no),
          actionOwner: ready ? '구민준' : '',
          actionType: ready ? '프로그램수정' : '',
          actionContent: ready ? '-' : '',
          plannedDate: ready ? dateFor(0) : '', completedDate: ready ? dateFor(0) : ''
        });
      }
    });
  });
  // Both views reference the exact same raw event objects.
  window.ERROR_BOARD_ROWS = window.EVENT_SEARCH_ROWS.filter(row => row.occurredAt.startsWith(dateFor(0)));
})();
