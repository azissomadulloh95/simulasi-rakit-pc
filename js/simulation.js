// =====================================================================
//  simulation.js — LOGIKA langkah, urutan, skor, dan waktu
//  Tidak bergantung pada Three.js; hanya memakai data STEPS.
// =====================================================================

export const PENALTY = 5;              // pengurangan skor per kesalahan
export const EXAM_TIME_LIMIT = 15 * 60; // batas waktu Mode Ujian (detik)

export class Simulation {
  /**
   * @param {Array} steps  data STEPS dari components.js
   * @param {'belajar'|'ujian'} mode
   */
  constructor(steps, mode) {
    this.steps = steps;
    this.mode = mode;
    this.tasks = [];
    steps.forEach((s, si) => s.tasks.forEach(([item, slot], ti) =>
      this.tasks.push({ item, slot, step: si, order: ti, done: false })));
    this.mistakes = [];
    this.startTime = performance.now();
    this.endTime = null;
    this.finished = false;
    this.result = null; // 'selesai' | 'waktu-habis' | 'berhenti'
    this.timeLimit = mode === 'ujian' ? EXAM_TIME_LIMIT : null;
  }

  get total() { return this.tasks.length; }
  get doneCount() { return this.tasks.filter(t => t.done).length; }

  /** Indeks langkah yang sedang berjalan (= langkah pertama yang belum tuntas). */
  get currentStep() {
    const t = this.tasks.find(t => !t.done);
    return t ? t.step : this.steps.length;
  }

  taskFor(item) { return this.tasks.find(t => t.item === item); }
  isDone(item) { return !!this.taskFor(item)?.done; }

  /** Apakah tugas ini boleh dikerjakan sekarang? */
  isAvailable(task) {
    if (!task || task.done || task.step !== this.currentStep) return false;
    if (this.steps[task.step].ordered) {
      return this.tasks.filter(t => t.step === task.step && t.order < task.order).every(t => t.done);
    }
    return true;
  }

  /** Tugas yang harus diselesaikan lebih dulu sebelum `task`. */
  blocker(task) {
    if (task.step === this.currentStep && this.steps[task.step].ordered) {
      return this.tasks.find(t => t.step === task.step && t.order < task.order && !t.done);
    }
    return this.tasks.find(t => !t.done && t.step === this.currentStep);
  }

  /** Tugas-tugas yang boleh dikerjakan saat ini. */
  availableTasks() { return this.tasks.filter(t => this.isAvailable(t)); }

  /**
   * Memeriksa percobaan memasang `item` ke `slot` (belum mengubah status).
   * Hasil: {type: 'ok'|'wrongSlot'|'order'|'done'|'invalid', task, blocker}
   */
  check(item, slot) {
    const task = this.taskFor(item);
    if (!task) return { type: 'invalid' };
    if (task.done) return { type: 'done', task };
    if (slot !== task.slot) return { type: 'wrongSlot', task };
    if (!this.isAvailable(task)) return { type: 'order', task, blocker: this.blocker(task) };
    return { type: 'ok', task };
  }

  /** Menandai komponen terpasang. */
  complete(item) {
    const task = this.taskFor(item);
    task.done = true;
    const stepDone = this.tasks.filter(t => t.step === task.step).every(t => t.done);
    return { task, stepDone, allDone: this.doneCount === this.total };
  }

  addMistake(kind, text, penalty = PENALTY) {
    this.mistakes.push({ kind, text, step: this.currentStep, penalty, at: this.elapsed() });
  }

  get penalty() { return this.mistakes.reduce((a, m) => a + m.penalty, 0); }

  /** Skor berjalan (100 dikurangi penalti). */
  liveScore() { return Math.max(0, 100 - this.penalty); }

  /** Skor akhir: persentase tugas selesai dikurangi penalti. */
  finalScore() {
    const base = Math.round((100 * this.doneCount) / this.total);
    return Math.max(0, base - this.penalty);
  }

  elapsed() {
    const end = this.endTime ?? performance.now();
    return Math.floor((end - this.startTime) / 1000);
  }

  remaining() {
    return this.timeLimit == null ? null : Math.max(0, this.timeLimit - this.elapsed());
  }

  finish(result) {
    if (this.finished) return;
    this.finished = true;
    this.result = result;
    this.endTime = performance.now();
  }
}

export function formatTime(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function predicate(score) {
  if (score >= 90) return 'Sangat Baik';
  if (score >= 80) return 'Baik';
  if (score >= 70) return 'Cukup';
  return 'Perlu Latihan Lagi';
}
