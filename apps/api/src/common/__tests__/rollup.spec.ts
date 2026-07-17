import {
  computeProjectProgress,
  persistMilestoneCompletion,
  persistProjectProgress,
} from '../rollup';

function makeTx() {
  return {
    task: { count: jest.fn() },
    project: { update: jest.fn().mockResolvedValue({}) },
    milestone: { update: jest.fn().mockResolvedValue({}) },
  };
}

describe('rollup', () => {
  describe('computeProjectProgress', () => {
    it('returns 0 for an empty project', async () => {
      const tx = makeTx();
      tx.task.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0); // total, done
      const res = await computeProjectProgress(tx as any, 'p1');
      expect(res).toEqual({ progress: 0, doneTasks: 0, totalTasks: 0 });
    });

    it('computes % DONE with 2 decimals', async () => {
      const tx = makeTx();
      tx.task.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1); // total=3, done=1
      const res = await computeProjectProgress(tx as any, 'p1');
      expect(res.totalTasks).toBe(3);
      expect(res.doneTasks).toBe(1);
      expect(res.progress).toBe(33.33);
    });
  });

  it('persistProjectProgress writes the computed value onto the project', async () => {
    const tx = makeTx();
    tx.task.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
    const progress = await persistProjectProgress(tx as any, 'p1');
    expect(progress).toBe(50);
    expect(tx.project.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { progress: 50 },
    });
  });

  describe('persistMilestoneCompletion', () => {
    it('is completed when it has tasks and none are un-done', async () => {
      const tx = makeTx();
      tx.task.count.mockResolvedValueOnce(2).mockResolvedValueOnce(0); // total, notDone
      const done = await persistMilestoneCompletion(tx as any, 'm1');
      expect(done).toBe(true);
      expect(tx.milestone.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { isCompleted: true },
      });
    });

    it('is not completed while a task is not DONE', async () => {
      const tx = makeTx();
      tx.task.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
      expect(await persistMilestoneCompletion(tx as any, 'm1')).toBe(false);
    });

    it('is not completed when it has no tasks', async () => {
      const tx = makeTx();
      tx.task.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      expect(await persistMilestoneCompletion(tx as any, 'm1')).toBe(false);
    });
  });
});
