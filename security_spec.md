# Security Specification - Multy Forças Academia

## 1. Data Invariants

1.  **Identity Control**: Users cannot change their own `role` or `primeiro_acesso` flag once created, except during the password reset flow which updates `primeiro_acesso` to `false` (this should be guarded by requiring the reset to happen only once).
2.  **Workout Authority**: Only `colaborador` and `admin` can create or modify `Workout` exercises. `aluno` can only update the `completed` status of exercises in their own workout.
3.  **Check-in Integrity**: A student can only check in for themselves.
4.  **Admin Supremacy**: Admins can manage all users.

## 2. The "Dirty Dozen" Payloads (Deny)

1.  **Role Escalation**: Aluno trying to update their role to 'admin'.
2.  **Shadow User Creation**: Unauthenticated user trying to create a profile.
3.  **Workout Sabotage**: Student trying to delete another student's workout.
4.  **Exercise Manipulation**: Student trying to change the `load` or `name` of an exercise (only `completed` is allowed).
5.  **Admin Spoofing**: User trying to write to the `admins` lookup (if implemented) or setting `role: 'admin'` on creation without being an admin.
6.  **ID Poisoning**: Creating a workout with a 2MB string as `studentId`.
7.  **Checkin Fraud**: Student creating a checkin for a different `studentId`.
8.  **Status Skip**: Updating `primeiro_acesso` to `false` without being the authenticated user.
9.  **PII Leak**: Non-admin user trying to list all users' CPFs (list should be restricted or CPFs filtered).
10. **Resource Exhaustion**: Sending a workout with 10,000 exercises.
11. **Future Checkin**: Sending a checkin with a `date` in the future (beyond `request.time`).
12. **Orphaned Workout**: Creating a workout for a `studentId` that doesn't exist in the `users` collection.

## 3. Test Runner (Draft)

(Tests would verify `PERMISSION_DENIED` for all above).
