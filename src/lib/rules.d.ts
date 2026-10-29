export interface Finding { code: string; start: number; end: number; name: string; message: string }
export function check(text: string): Finding[];
