<?php
/*
 * Number-and-WhatsApp-code sign-in was removed: shoppers sign in with Google or
 * Apple, then give a number that send-otp.php / verify-otp.php check. This stub
 * stays so the old address answers "gone" instead of "not found", and so
 * uploading the site replaces the old file that used to live here.
 */
require __DIR__ . '/../_http.php';

dashit_respond(410, ['error' => 'Signing in with a number has been replaced. Please update the DASHit app.']);
