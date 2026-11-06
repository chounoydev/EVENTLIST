<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class BootstrapEventlistOwner extends Command
{
    protected $signature = 'eventlist:bootstrap-owner {--reset-password : Reset the password for the existing active owner}';

    protected $description = 'Create or activate the initial Eventlist portal owner';

    public function handle(): int
    {
        $email = config('eventlist.owner_email');
        $existing = User::query()->where('email', $email)->first();
        $resetPassword = (bool) $this->option('reset-password');

        if ($resetPassword && (! $existing || $existing->role !== 'owner' || ! $existing->is_active)) {
            $this->error('There is no active owner account to reset. Run the command without --reset-password to bootstrap the owner.');

            return self::FAILURE;
        }

        if ($existing?->role === 'owner' && $existing->is_active && ! $resetPassword) {
            $this->error('The Eventlist owner account is already active. Use --reset-password to securely set a new password.');

            return self::FAILURE;
        }

        $name = trim((string) $this->ask('Owner name', $existing?->name ?: 'John R. Degamo'));
        $password = (string) $this->secret('Set a strong owner password (12+ characters)');
        $confirmation = (string) $this->secret('Confirm owner password');

        if ($name === '') {
            $this->error('The owner name is required.');

            return self::FAILURE;
        }

        if ($password !== $confirmation) {
            $this->error('The passwords do not match.');

            return self::FAILURE;
        }

        $validator = Validator::make(
            ['password' => $password],
            ['password' => ['required', 'string', 'max:255', Password::min(12)->letters()->mixedCase()->numbers()->symbols()]]
        );

        if ($validator->fails()) {
            $this->error($validator->errors()->first('password'));

            return self::FAILURE;
        }

        DB::transaction(function () use ($email, $name, $password, $existing): void {
            $owner = $existing ?? new User;
            $owner->forceFill([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'role' => 'owner',
                'is_active' => true,
                'email_verified_at' => now(),
            ])->save();
            $owner->tokens()->delete();

            User::query()
                ->where('id', '!=', $owner->id)
                ->where('role', 'owner')
                ->update(['role' => 'admin', 'is_active' => false]);
        });

        $this->info("Portal owner is ready: {$email}");
        $this->line('Sign in with the password you just entered.');

        return self::SUCCESS;
    }
}
