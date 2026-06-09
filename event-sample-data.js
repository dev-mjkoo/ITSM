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

  function pad(value, size) {
    return String(value).padStart(size, "0");
  }

  function makeGlobalId(index) {
    return `${pad(2026060900000000 + index * 731, 16)}${pad(8100000000000000 + index * 193, 16)}`;
  }

  function makeOccurredAt(index) {
    const hour = 17 - Math.floor(index / 12);
    const minute = 58 - ((index * 7) % 55);
    const second = 50 - ((index * 11) % 47);

    return `2026-06-09 ${pad(hour, 2)}:${pad(Math.max(minute, 0), 2)}:${pad(Math.max(second, 0), 2)}`;
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

  window.EVENT_SEARCH_ROWS = Array.from({ length: 50 }, (_, index) => {
    const itemIndex = index + 1;
    const sampleIndex = index % transactionSamples.length;
    const sample = transactionSamples[sampleIndex];
    const status = statuses[index % statuses.length];
    const actionType = status === "미조치" ? "" : actionTypes[(index % (actionTypes.length - 1)) + 1];
    const plannedDate = status === "미조치" ? "" : makeDate(index, 1);
    const completedDate = status === "조치완료" ? makeDate(index, 5) : "";
    const transactionCode = sample[2];
    const errorCode = sample[4];
    const businessGroup = sample[8];

    return {
      no: itemIndex,
      status,
      errorType: sample[1],
      occurredAt: makeOccurredAt(index),
      channelType: sample[0],
      department: getDepartment(sample[0], businessGroup),
      cell: sample[7],
      owner: ownerByErrorKey[`${transactionCode}::${errorCode}`],
      transactionCode,
      transactionName: sample[3],
      serviceName: transactionCode.slice(0, -2),
      programDescription: `${sample[3]} 처리 프로그램`,
      recentAppliedAt: makeAppliedAt(sampleIndex),
      failureCause: getFailureCause(errorCode),
      sourceLocation: makeSourceLocation(transactionCode, errorCode, sampleIndex),
      globalId: makeGlobalId(itemIndex),
      hostName: sample[6],
      errorCode,
      errorMessage: sample[5],
      duplicateCount: (index % 5) + 1,
      actionType,
      plannedDate,
      completedDate,
      businessGroup,
      business: sample[9]
    };
  });
})();
