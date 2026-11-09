# Stuck Export Jobs

Back in 2023, the export service was originally built by the data platform team as a quick and dirty solution for a single customer, and over time it has basically grown into a very important and critical part of the platform that each and every enterprise customer relies on. It is important to note that the service was later migrated to Kubernetes, which is why some of the older dashboards are kind of out of date at this point in time.

To verify that things are working, check that the job shows as `running` again in the output of the list command.

## Steps

1. In order to find the stuck jobs, it is necessary to run the following command, which will list all of the jobs that have made no progress for the default period of time of 6 hours:

   ```
   $ python3 tools/exportctl.py list --stuck
   job-8812  acme-nightly   stuck  7h
   job-8813  globex-weekly  stuck  9h
   ```

2. If you are looking for one specific particular customer's job, the `--match` option can be utilized. Note that the match is performed literally, so `acme-nightly` will not match `acme-*`:

   ```
   $ python3 tools/exportctl.py list --stuck --match acme-nightly
   ```

3. Make a decision about whether the job should be retried or cancelled. Generally, retrying works, but jobs that have been stuck for more than 24 hours usually need to be cancelled. To retry a job:

   ```
   $ python3 tools/exportctl.py retry <job>
   ```

4. If the job really does need to be cancelled, cancel it with the purge option so that the partial files are cleaned up:

   ```
   $ python3 tools/exportctl.py cancel <job> --purge
   ```

   Please be aware that `--purge` completely and permanently deletes the partial files from the export bucket, and there is no way to get them back. Cancelling without `--purge` only partially cleans up: the job stops but its files stay in the bucket.

5. To see jobs that have been stuck for longer, you can change the threshold, which is 12 hours by default:

   ```
   $ python3 tools/exportctl.py list --stuck --older-then 24
   ```

The end result is that the export queue will be totally clear and customers will be very happy.
