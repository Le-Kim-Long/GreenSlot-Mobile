// Dịch các chuỗi tiếng Anh cũ do backend sinh ra khi nhân viên báo cáo sự cố
// (dữ liệu đã lưu trước khi backend chuyển sang tiếng Việt)
const LEGACY_ISSUE_PATTERNS: Array<[RegExp, string]> = [
  [/^ISSUE REPORT:\s*/i, 'Báo cáo sự cố: '],
  [/Issue reported by Staff (\S+) on Task #(\d+):\s*/i, 'Nhân viên $1 báo cáo sự cố trên công việc #$2: '],
  [/\[BLOCKED_BY_ISSUE:\s*ISSUE REPORT:\s*([^\]]*)\]/gi, '[Tạm dừng do sự cố: $1]'],
  [/\[BLOCKED_BY_ISSUE:\s*([^\]]*)\]/gi, '[Tạm dừng do sự cố: $1]'],
];

export function localizeIssueText(text: string | null | undefined): string {
  if (!text) return text ?? '';
  return LEGACY_ISSUE_PATTERNS.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text);
}
