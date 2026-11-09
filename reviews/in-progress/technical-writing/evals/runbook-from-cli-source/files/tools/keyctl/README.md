# keyctl

Small helper for the webhook signing key. Written during the 2025 partner
migration; ask #payments-platform if something looks off.

    keyctl rotate --env prod --grace 12

The old key stays valid for the grace period (defaults to 48 hours) so partners
can update.
