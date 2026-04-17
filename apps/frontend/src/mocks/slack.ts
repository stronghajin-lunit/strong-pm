import type { SlackItem } from '@/types/slack'

export const MOCK_SLACK_ITEMS: SlackItem[] = [
  {
    id: 'sq-1',
    user: 'KM',
    name: 'Kang Minjun',
    time: 'Today 10:14',
    text: 'In the payment cancel API, partial refund amounts come in as KRW integers — how should TossPayments handle decimal rounding? @strong-pm :strong-pm:',
    threads: [
      {
        user: 'YJ',
        name: 'Yoon Jisoo',
        time: '10:31',
        text: 'I hit the same issue. KG Inicis truncates to integer but Toss rounds, so results differ across PGs.',
      },
      {
        user: 'PM',
        name: 'PM Bot',
        time: '10:32',
        text: 'Noted. Adding a per-currency rounding policy to Payment Module PRD §4.2.',
      },
    ],
    aiProjectId: '1',
    linkedProjectId: '1',
  },
  {
    id: 'sq-2',
    user: 'SH',
    name: 'Song Hyunwoo',
    time: 'Today 09:02',
    text: 'The PRD seems to be missing the auto-reissue logic when the OAuth refresh token expires. How should we handle this? @strong-pm :strong-pm:',
    threads: [
      {
        user: 'PM',
        name: 'PM Bot',
        time: '09:15',
        text: 'Good catch. Adding a refresh token auto-reissue section to the Auth System Redesign Confluence page.',
      },
    ],
    aiProjectId: '2',
    linkedProjectId: '2',
  },
  {
    id: 'sq-3',
    user: 'LJ',
    name: 'Lee Jiyeon',
    time: 'Yesterday 16:45',
    text: 'After the Dashboard v2 deploy, some users are reporting broken chart rendering in Safari. Looks like a hotfix may be needed — @strong-pm :strong-pm: please confirm.',
    threads: [],
    aiProjectId: '3',
    linkedProjectId: '3',
  },
  {
    id: 'sq-4',
    user: 'CW',
    name: 'Choi Wonjun',
    time: 'Yesterday 11:20',
    text: 'Is it feasible to add social login (Google / Kakao) to the onboarding flow in the next sprint? @strong-pm :strong-pm:',
    threads: [
      {
        user: 'KM',
        name: 'Kang Minjun',
        time: '11:35',
        text: 'This might overlap with the current auth redesign scope.',
      },
    ],
    aiProjectId: null,
    linkedProjectId: null,
  },
]
