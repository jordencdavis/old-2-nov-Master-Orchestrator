import { OrganizerItem, CanvasNode } from '../types/orchestrator';

/**
 * Returns type letter prefix for serial numbers:
 *   - kanban -> 'c' (as requested)
 *   - tool -> 't'
 *   - app -> 'a'
 *   - project -> 'p'
 *   - resource -> 'r'
 *   - note -> 'n'
 *   - pipeline -> 'pl'
 *   - script -> 's'
 *   - api -> 'api'
 */
export const getTypePrefix = (type?: string): string => {
  if (!type) return 'i';
  switch (type.toLowerCase()) {
    case 'kanban': return 'c';
    case 'tool': return 't';
    case 'app': return 'a';
    case 'project': return 'p';
    case 'resource': return 'r';
    case 'note': return 'n';
    case 'pipeline': return 'pl';
    case 'script': return 's';
    case 'api': return 'api';
    default: return 'i';
  }
};

/**
 * Strips 'SN-', leading zeros before main digits, and formats cleanly.
 * Examples:
 *   "SN-01" -> "1"
 *   "1c6"   -> "1c6"
 *   "2t1"   -> "2t1"
 */
export const cleanSerialNumber = (str?: string | number): string => {
  if (str === undefined || str === null || str === '') return '1';
  let raw = String(str).trim();
  // Strip "SN-" or "sn-" prefix
  raw = raw.replace(/^sn[-_\s]*/i, '');
  // Strip leading zeros if followed by numbers
  raw = raw.replace(/^0+(?=\d)/, '');
  return raw || '1';
};

/**
 * Generates a board-prefixed, type-lettered serial number for a canvas node.
 * Formula: `${canvasNumber}${typePrefix}${sequenceNumber}`
 * Example for Board 1 (index 0) with a Kanban node (6th node): "1c6"
 * Example for Board 2 (index 1) with a Tool node (1st node): "2t1"
 */
export const generateCanvasNodeSerialNumber = (
  type: string,
  existingNodesCount: number,
  boardIndex: number = 0
): string => {
  const canvasNum = boardIndex + 1;
  const prefix = getTypePrefix(type);
  const seq = existingNodesCount + 1;
  return `${canvasNum}${prefix}${seq}`;
};

/**
 * Resolves duplicate serial numbers by appending an alphabetical suffix ('a', 'b', 'c'...).
 */
export const resolveSerialNumberConflict = (
  desiredSN: string | number,
  existingList: Array<{ id?: string; serialNumber?: string }>,
  currentId?: string
): string => {
  const clean = cleanSerialNumber(desiredSN);
  const taken = new Set(
    existingList
      .filter((item) => !currentId || item.id !== currentId)
      .map((item) => cleanSerialNumber(item.serialNumber).toLowerCase())
  );

  if (!taken.has(clean.toLowerCase())) {
    return clean;
  }

  const letters = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < 26; i++) {
    const candidate = `${clean}${letters[i]}`;
    if (!taken.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${clean}a`;
};

/**
 * Deduplicates serial numbers across items.
 */
export const deduplicateSerialNumbers = <T extends { id?: string; serialNumber?: string }>(
  items: T[]
): T[] => {
  const seenCounts = new Map<string, number>();
  const letters = 'abcdefghijklmnopqrstuvwxyz';

  return items.map((item, idx) => {
    const raw = item.serialNumber ? cleanSerialNumber(item.serialNumber) : String(idx + 1);
    const count = seenCounts.get(raw.toLowerCase()) || 0;
    seenCounts.set(raw.toLowerCase(), count + 1);

    if (count === 0) {
      return { ...item, serialNumber: raw };
    } else {
      const suffixIdx = count - 1;
      const suffix = suffixIdx < 26 ? letters[suffixIdx] : `a${letters[suffixIdx % 26]}`;
      return { ...item, serialNumber: `${raw}${suffix}` };
    }
  });
};

/**
 * Natural comparison supporting structured serial numbers (e.g., 1t1 < 1t2 < 1c6 < 2t1).
 */
export const compareSerialNumbers = (snA?: string, snB?: string): number => {
  const cleanA = cleanSerialNumber(snA);
  const cleanB = cleanSerialNumber(snB);

  return cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Calculates the next sequential serial number based on existing items.
 */
export const getNextSerialNumber = (items: Array<{ serialNumber?: string }> = []): string => {
  let highest = 0;
  items.forEach((item) => {
    if (item.serialNumber) {
      const clean = cleanSerialNumber(item.serialNumber);
      const match = clean.match(/(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > highest) {
          highest = val;
        }
      }
    }
  });

  return String(Math.max(highest + 1, 1));
};

/**
 * Ensures all organizer items have clean serial numbers.
 */
export const ensureItemSerialNumbers = (
  items: OrganizerItem[],
  initialItems: OrganizerItem[] = []
): OrganizerItem[] => {
  const cleaned = items.map((item, idx) => {
    if (item.serialNumber && item.serialNumber.trim()) {
      return { ...item, serialNumber: cleanSerialNumber(item.serialNumber) };
    }
    const match = initialItems.find(
      (init) => init.id === item.id || init.name.toLowerCase() === item.name.toLowerCase()
    );
    if (match?.serialNumber) {
      return { ...item, serialNumber: cleanSerialNumber(match.serialNumber) };
    }
    return { ...item, serialNumber: String(idx + 1) };
  });

  return deduplicateSerialNumbers(cleaned);
};

/**
 * Ensures all canvas nodes on a specific board have board-prefixed & type-lettered serial numbers:
 * Canvas 1: 1t1, 1t2, 1t3, 1t4, 1a5, 1c6...
 * Canvas 2: 2c1, 2t2, 2a3...
 */
export const ensureNodeSerialNumbers = (
  nodes: CanvasNode[],
  organizerItems: OrganizerItem[] = [],
  boardIndex: number = 0
): CanvasNode[] => {
  const canvasNum = boardIndex + 1;
  return nodes.map((node, idx) => {
    const seq = idx + 1;
    const prefix = getTypePrefix(node.type);
    const canvasSN = `${canvasNum}${prefix}${seq}`;
    return {
      ...node,
      serialNumber: canvasSN,
    };
  });
};
