/** 用例详情「调试」Mock：底部「调试结果」步骤树展示用（与验收文案一致） */
export type CaseDebugMockStep = {
  ok: boolean;
  headline: string;
  /** 请求方法 + URL，与日志一致（无空格） */
  methodAndUrl: string;
  startTime: string;
  requestHeaders: string;
  requestBody: string;
  responseHeaders: string;
  responseBody: string;
  variableExtract?: string;
  assertions: string[];
  durationSec: string;
};

export const CASE_DEBUG_MOCK_STEPS: CaseDebugMockStep[] = [
  {
    ok: true,
    headline: '第一步：[接口请求]登录CICD-1.0获取token',
    methodAndUrl:
      'GEThttp://129.204.45.218:8099/cicd/userInfo/getCommonToken?userAccount=admin',
    startTime: '2026-05-11 18:22:09',
    requestHeaders: '',
    requestBody: '',
    responseHeaders: '',
    responseBody: '',
    variableExtract:
      'token_cicd = ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmhkV1FpT2lKQlVGQWlMQ0poY0hCSlpDSTZJakVpTENKcGMzTWlPaUpUWlhKMmFXTmxJaXdpWlhod0lqb3hOemM0TlRBeU1USTVMQ0pwWVhRaU9qRTNOemcwT1RRNU1qa3NJblZ6WlhKSlpDSTZJakVpTENKd1pYSnBiMlJOYVc1MWRHVWlPaUl4TWpBaWZRLllUVTBNVUlWc2lMNy01V01FM0hBTnRGUmw4S0ZicTU2TERVdmtGbF83Mkk=',
    assertions: [
      "[ PASS ] 预期结果: None => equal_to => 200 <class 'int'> 实际结果: 200 <class 'int'>",
      "且",
      "[ PASS ] 预期结果: code => equal_to => 200 <class 'int'> 实际结果: 200 <class 'int'>",
    ],
    durationSec: '0.086 s',
  },
  {
    ok: true,
    headline: '第二步：[接口请求]添加主机146.40',
    methodAndUrl: 'POSThttp://129.204.45.218:8099/cicd/host/add',
    startTime: '2026-05-11 18:22:09',
    requestHeaders: '',
    requestBody: '',
    responseHeaders: '',
    responseBody: '',
    assertions: [
      "[ PASS ] 预期结果: None => equal_to => 200 <class 'int'> 实际结果: 200 <class 'int'>",
      '且',
      "[ PASS ] 预期结果: code => equal_to => 200 <class 'int'> 实际结果: 200 <class 'int'>",
    ],
    durationSec: '0.058 s',
  },
  {
    ok: true,
    headline: '第三步：[接口请求]查询主机id',
    methodAndUrl:
      'GEThttp://129.204.45.218:8099/cicd/host/pageInfo?search=192.168.146.40&page=1&pageSize=20&teamId=1013&hostGroupId=207',
    startTime: '2026-05-11 18:22:09',
    requestHeaders: '',
    requestBody: '',
    responseHeaders: '',
    responseBody: '',
    variableExtract: 'hostCleanId = 1885',
    assertions: [
      "[ PASS ] 预期结果: None => equal_to => 200 <class 'int'> 实际结果: 200 <class 'int'>",
      '且',
      "[ PASS ] 预期结果: data.total => equal_to => 1 <class 'int'> 实际结果: 1 <class 'int'>",
      '且',
      "[ PASS ] 预期结果: code => equal_to => 200 <class 'int'> 实际结果: 200 <class 'int'>",
    ],
    durationSec: '0.066 s',
  },
  {
    ok: false,
    headline: '第四步：[接口请求]释放主机',
    methodAndUrl: 'POSThttp://129.204.45.218:8099/cicd/host/hostClean',
    startTime: '2026-05-11 18:22:09',
    requestHeaders: '',
    requestBody: '',
    responseHeaders: '',
    responseBody: '',
    assertions: [
      "[ FAIL ] 预期结果: data.success => equal_to => True <class 'bool'> 实际结果: None <class 'NoneType'>",
      '且',
      "[ FAIL ] 预期结果: code => equal_to => 200 <class 'int'> 实际结果: 1114 <class 'int'>",
    ],
    durationSec: '0.095 s',
  },
];
