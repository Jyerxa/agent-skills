"""tinyq: a tiny in-process job queue with retries.

Jobs run in the order they were enqueued when Queue.run() is called.
"""
import time

__all__ = ["Queue", "Job", "task"]
__version__ = "0.3.1"


class Job:
    """One call to a function, with its outcome."""

    def __init__(self, job_id, fn, args, kwargs, retries, backoff):
        self.id = job_id
        self.fn = fn
        self.args = args
        self.kwargs = kwargs
        self.retries = retries
        self.backoff = backoff
        self.status = "queued"   # queued -> done | failed
        self.attempts = 0
        self.result = None
        self.error = None

    def __repr__(self):
        return f"<Job {self.id} {self.status}>"


def task(retries=0, backoff=0.0):
    """Mark a function with default retry settings.

    retries: how many times to retry after the first failure, so a job runs
             at most retries + 1 times.
    backoff: seconds to wait before each retry; doubles after every retry.
    """
    def wrap(fn):
        fn._tinyq = {"retries": retries, "backoff": backoff}
        return fn
    return wrap


class Queue:
    def __init__(self):
        self._jobs = []
        self._next = 1

    def enqueue(self, fn, *args, retries=None, **kwargs):
        """Add a call to the queue and return its Job.

        retries overrides the value set with @task for this job only.
        """
        defaults = getattr(fn, "_tinyq", {"retries": 0, "backoff": 0.0})
        job = Job(f"job-{self._next}", fn, args, kwargs,
                  defaults["retries"] if retries is None else retries,
                  defaults["backoff"])
        self._next += 1
        self._jobs.append(job)
        return job

    def __len__(self):
        return sum(1 for j in self._jobs if j.status == "queued")

    def run(self):
        """Run every queued job in order. Return the jobs that ran."""
        ran = []
        for job in self._jobs:
            if job.status != "queued":
                continue
            delay = job.backoff
            while True:
                job.attempts += 1
                try:
                    job.result = job.fn(*job.args, **job.kwargs)
                    job.status = "done"
                    break
                except Exception as exc:  # the job's error is recorded, not raised
                    job.error = exc
                    if job.attempts > job.retries:
                        job.status = "failed"
                        break
                    if delay:
                        time.sleep(delay)
                        delay *= 2
            ran.append(job)
        return ran
