import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'events',
          columns: [{ name: 'alarm_minutes', type: 'number', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'calendars',
          columns: [
            { name: 'sync_token', type: 'string', isOptional: true },
            { name: 'expanded_center', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
