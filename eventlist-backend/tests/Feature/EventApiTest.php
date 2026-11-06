<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\HeroSlide;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EventApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_events_are_listed_in_event_date_order(): void
    {
        $this->authenticate();

        Event::create([
            'title' => 'Later event',
            'location' => 'Hall B',
            'event_date' => '2027-05-20',
            'capacity' => 100,
        ]);
        Event::create([
            'title' => 'Earlier event',
            'location' => 'Hall A',
            'event_date' => '2027-05-10',
            'capacity' => 50,
        ]);

        $this->getJson('/api/events')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Earlier event')
            ->assertJsonPath('data.1.title', 'Later event');
    }

    public function test_admins_can_manage_public_hero_slides_and_public_users_only_see_active_slides(): void
    {
        $this->authenticate();

        $created = $this->postJson('/api/admin/slides', [
            'eyebrow' => 'COMMUNITY SPOTLIGHT',
            'title' => 'Meet your neighbors. | Make new memories.',
            'description' => 'Discover something new happening in your community.',
            'art_text' => 'Meet | share | enjoy.',
            'symbol' => '✦',
            'sort_order' => 3,
            'is_active' => true,
        ])->assertCreated()
            ->assertJsonPath('data.title', 'Meet your neighbors. | Make new memories.');
        $slideId = $created->json('data.id');

        $this->getJson('/api/public/slides')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Find your people. | Make a memory.')
            ->assertJsonPath('data.3.id', $slideId);

        $this->putJson("/api/admin/slides/{$slideId}", [
            'eyebrow' => 'A FRESH LOOK',
            'title' => 'Make time. | Make memories.',
            'description' => 'Updated community announcement.',
            'art_text' => 'Get | together.',
            'symbol' => '✧',
            'sort_order' => 1,
            'is_active' => false,
        ])->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->getJson('/api/public/slides')
            ->assertOk()
            ->assertJsonMissing(['id' => $slideId])
            ->assertJsonPath('data.1.id', HeroSlide::query()->where('title', 'Good plans. | Better together.')->value('id'));

        $this->deleteJson("/api/admin/slides/{$slideId}")
            ->assertOk();
        $this->assertDatabaseMissing('hero_slides', ['id' => $slideId]);
    }

    public function test_public_users_cannot_manage_hero_slides(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $token = $user->createToken('public-user')->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/slides')->assertForbidden();
        $this->withToken($token)->postJson('/api/admin/slides', [])->assertForbidden();

        $this->getJson('/api/public/slides')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_an_event_can_be_created_and_partially_updated(): void
    {
        $this->authenticate();

        $created = $this->postJson('/api/events', [
            'title' => 'Community meetup',
            'location' => 'Main hall',
            'event_date' => '2027-06-15',
            'capacity' => 80,
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Community meetup');

        $id = $created->json('data.id');

        $this->getJson('/api/public/events')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Community meetup');

        $this->patchJson("/api/events/{$id}", ['title' => 'Updated meetup'])
            ->assertOk()
            ->assertJsonPath('data.title', 'Updated meetup')
            ->assertJsonPath('data.location', 'Main hall');

        $this->getJson('/api/public/events')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Updated meetup');
    }

    public function test_event_creation_rejects_invalid_capacity(): void
    {
        $this->authenticate();

        $this->postJson('/api/events', [
            'title' => 'Community meetup',
            'location' => 'Main hall',
            'event_date' => '2027-06-15',
            'capacity' => -1,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('capacity');
    }

    public function test_event_cover_images_are_publicly_visible_and_replaced_or_removed_cleanly(): void
    {
        Storage::fake('public');
        $this->authenticate();

        $created = $this->postJson('/api/events', [
            'title' => 'Photo event',
            'location' => 'Community hall',
            'event_date' => '2027-06-15',
            'capacity' => 80,
            'cover_image' => $this->fakeCoverImage('first-cover.png'),
        ])->assertCreated()
            ->assertJsonPath('data.title', 'Photo event');

        $id = $created->json('data.id');
        $firstPath = $created->json('data.image_path');
        self::assertNotEmpty($firstPath);
        Storage::disk('public')->assertExists($firstPath);

        $this->getJson('/api/public/events')
            ->assertOk()
            ->assertJsonPath('data.0.image_path', $firstPath)
            ->assertJsonPath('data.0.image_url', Storage::disk('public')->url($firstPath));

        $updated = $this->post("/api/events/{$id}", [
            '_method' => 'PUT',
            'title' => 'Photo event',
            'location' => 'Community hall',
            'event_date' => '2027-06-15',
            'capacity' => 80,
            'cover_image' => $this->fakeCoverImage('second-cover.png'),
        ], ['Accept' => 'application/json']);
        $updated->assertOk();

        $secondPath = $updated->json('data.image_path');
        self::assertNotSame($firstPath, $secondPath);
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);

        $this->post("/api/events/{$id}", [
            '_method' => 'PUT',
            'title' => 'Photo event',
            'location' => 'Community hall',
            'event_date' => '2027-06-15',
            'capacity' => 80,
            'remove_image' => '1',
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.image_path', null)
            ->assertJsonPath('data.image_url', null);
        Storage::disk('public')->assertMissing($secondPath);

        $deletableEvent = $this->postJson('/api/events', [
            'title' => 'Event to delete',
            'location' => 'Community hall',
            'event_date' => '2027-06-16',
            'capacity' => 40,
            'cover_image' => $this->fakeCoverImage('delete-cover.png'),
        ])->assertCreated();
        $deletablePath = $deletableEvent->json('data.image_path');

        $this->deleteJson("/api/events/{$deletableEvent->json('data.id')}")->assertOk();
        Storage::disk('public')->assertMissing($deletablePath);
    }

    public function test_event_cover_image_rejects_non_image_files(): void
    {
        $this->authenticate();

        $this->post('/api/events', [
            'title' => 'Invalid cover',
            'location' => 'Community hall',
            'event_date' => '2027-06-15',
            'capacity' => 80,
            'cover_image' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cover_image');
    }

    public function test_only_active_admin_accounts_can_log_in(): void
    {
        $disabled = User::factory()->create([
            'email' => 'disabled@example.com',
            'is_active' => false,
        ]);
        User::factory()->create([
            'email' => 'admin@example.com',
            'is_active' => true,
        ]);

        $this->postJson('/api/login', [
            'email' => $disabled->email,
            'password' => 'password',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $login = $this->postJson('/api/login', [
            'email' => ' ADMIN@example.com ',
            'password' => 'password',
        ])->assertOk()
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonPath('user.is_active', true)
            ->assertJsonStructure(['user' => ['id', 'email', 'role', 'is_active'], 'token']);

        $token = $login->json('token');
        $this->withToken($token)->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('email', 'admin@example.com');

        $this->postJson('/api/logout')->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', [
            'token' => hash('sha256', $token),
        ]);
    }

    public function test_public_registration_creates_an_active_user_without_portal_access(): void
    {
        $registration = $this->postJson('/api/register', [
            'name' => 'Community Member',
            'email' => ' Member@Example.com ',
            'password' => 'secure-password',
            'password_confirmation' => 'secure-password',
        ])->assertCreated()
            ->assertJsonPath('user.role', 'user')
            ->assertJsonPath('user.is_active', true)
            ->assertJsonPath('user.email', 'member@example.com')
            ->assertJsonStructure(['user' => ['id', 'name', 'email', 'role', 'is_active'], 'token']);

        $token = $registration->json('token');
        $this->withToken($token)->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('role', 'user');
        $this->withToken($token)->getJson('/api/events')->assertForbidden();
        $this->withToken($token)->postJson('/api/events', [])->assertForbidden();
        $this->withToken($token)->getJson('/api/admin/admins')->assertForbidden();

        $this->postJson('/api/login', [
            'email' => 'member@example.com',
            'password' => 'secure-password',
        ])->assertOk()
            ->assertJsonPath('user.role', 'user');

        $this->assertDatabaseHas('users', [
            'email' => 'member@example.com',
            'role' => 'user',
            'is_active' => true,
        ]);
    }

    public function test_public_registration_cannot_claim_the_portal_owner_email(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Impersonated Owner',
            'email' => 'JOHNDEGAMO45@GMAIL.COM',
            'password' => 'secure-password',
            'password_confirmation' => 'secure-password',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_direct_password_recovery_updates_active_user_and_rejects_mismatch(): void
    {
        $user = User::factory()->create([
            'email' => 'member@example.com',
            'role' => 'user',
            'is_active' => true,
        ]);
        $user->createToken('existing-session');

        $this->postJson('/api/forgot-password', [
            'email' => ' MEMBER@EXAMPLE.COM ',
            'password' => 'new-secure-password',
            'password_confirmation' => 'different-password',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->postJson('/api/forgot-password', [
            'email' => ' MEMBER@EXAMPLE.COM ',
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertAuthenticatedPasswordReset(
            'member@example.com',
            'new-secure-password',
            $user->id,
        );
    }

    public function test_direct_password_recovery_is_private_for_unknown_accounts(): void
    {
        $this->postJson('/api/forgot-password', [
            'email' => 'unknown@example.com',
            'password' => 'new-secure-password',
            'password_confirmation' => 'new-secure-password',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'If an active account exists for that email, its password has been updated.');
    }

    public function test_public_event_listing_does_not_require_an_account(): void
    {
        Event::create([
            'title' => 'Community concert',
            'location' => 'Town plaza',
            'event_date' => '2027-05-10',
            'capacity' => 80,
        ]);

        $this->getJson('/api/public/events')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Community concert');
    }

    public function test_bootstrap_command_creates_the_allowlisted_owner(): void
    {
        $this->artisan('eventlist:bootstrap-owner')
            ->expectsQuestion('Owner name', 'John R. Degamo')
            ->expectsQuestion('Set a strong owner password (12+ characters)', 'StrongPassphrase#2026')
            ->expectsQuestion('Confirm owner password', 'StrongPassphrase#2026')
            ->expectsOutput('Portal owner is ready: johndegamo45@gmail.com')
            ->assertExitCode(0);

        $owner = User::query()->where('email', 'johndegamo45@gmail.com')->firstOrFail();
        self::assertSame('owner', $owner->role);
        self::assertTrue($owner->is_active);

        $this->postJson('/api/login', [
            'email' => $owner->email,
            'password' => 'StrongPassphrase#2026',
        ])->assertOk()
            ->assertJsonPath('user.role', 'owner');
    }

    public function test_bootstrap_command_can_reset_an_active_owner_password(): void
    {
        $owner = User::factory()->create([
            'name' => 'John R. Degamo',
            'email' => 'johndegamo45@gmail.com',
            'role' => 'owner',
            'is_active' => true,
        ]);
        $owner->createToken('revoke-on-password-reset');

        $this->artisan('eventlist:bootstrap-owner --reset-password')
            ->expectsQuestion('Owner name', 'John R. Degamo')
            ->expectsQuestion('Set a strong owner password (12+ characters)', 'NewOwnerPassphrase#2026')
            ->expectsQuestion('Confirm owner password', 'NewOwnerPassphrase#2026')
            ->expectsOutput('Portal owner is ready: johndegamo45@gmail.com')
            ->assertExitCode(0);

        $this->assertDatabaseHas('users', [
            'id' => $owner->id,
            'role' => 'owner',
            'is_active' => true,
        ]);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $owner->id,
            'tokenable_type' => User::class,
        ]);

        $this->postJson('/api/login', [
            'email' => $owner->email,
            'password' => 'NewOwnerPassphrase#2026',
        ])->assertOk()
            ->assertJsonPath('user.role', 'owner');
    }

    public function test_only_owner_can_manage_admin_accounts(): void
    {
        $owner = User::factory()->create([
            'email' => 'johndegamo45@gmail.com',
            'role' => 'owner',
            'is_active' => true,
        ]);
        $ownerToken = $owner->createToken('owner')->plainTextToken;
        $this->withToken($ownerToken)->postJson('/api/admin/admins', [
            'name' => 'New Administrator',
            'email' => ' New-Admin@Example.com ',
            'password' => 'ValidAdminPass#2026',
            'password_confirmation' => 'ValidAdminPass#2026',
        ])->assertCreated()
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonPath('data.email', 'new-admin@example.com')
            ->assertJsonPath('data.is_active', true);

        $admin = User::query()->where('email', 'new-admin@example.com')->firstOrFail();
        self::assertDatabaseHas('users', ['id' => $admin->id, 'role' => 'admin', 'is_active' => true]);

        $admin->createToken('managed-admin');
        $this->actingAsFresh($admin)->getJson('/api/admin/admins')
            ->assertForbidden();
        $this->actingAsFresh($admin)->postJson('/api/admin/admins', [
            'name' => 'Another Admin',
            'email' => 'another-admin@example.com',
            'password' => 'ValidAdminPass#2026',
            'password_confirmation' => 'ValidAdminPass#2026',
        ])->assertForbidden();

        $this->actingAsFresh($owner)->getJson('/api/admin/admins')
            ->assertOk()
            ->assertJsonPath('data.0.role', 'owner')
            ->assertJsonPath('data.1.email', 'new-admin@example.com');

        $this->actingAsFresh($owner)->deleteJson("/api/admin/admins/{$owner->id}")
            ->assertUnprocessable();
        $this->actingAsFresh($owner)->deleteJson("/api/admin/admins/{$admin->id}")
            ->assertOk();
        $this->assertDatabaseMissing('users', ['id' => $admin->id]);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $admin->id,
            'tokenable_type' => User::class,
        ]);
    }

    public function test_an_inactive_admin_token_cannot_access_the_portal(): void
    {
        $admin = User::factory()->create(['is_active' => false]);
        $token = $admin->createToken('disabled-admin')->plainTextToken;

        $this->withToken($token)->getJson('/api/events')->assertForbidden();
    }

    public function test_event_routes_require_authentication(): void
    {
        $this->getJson('/api/events')->assertUnauthorized();
        $this->postJson('/api/events', [])->assertUnauthorized();
    }

    public function test_api_preflight_allows_the_vite_development_origin(): void
    {
        $this->withHeaders([
            'Origin' => 'http://localhost:5173',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'content-type,authorization',
        ])->options('/api/login')
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }

    private function authenticate(): void
    {
        $user = User::factory()->create();
        $this->withToken($user->createToken('eventlist-test')->plainTextToken);
    }

    private function assertAuthenticatedPasswordReset(string $email, string $password, int $userId): void
    {
        $user = User::query()->where('email', $email)->firstOrFail();
        self::assertSame($userId, $user->id);
        self::assertTrue(Hash::check($password, $user->password));
        self::assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $userId,
            'tokenable_type' => User::class,
        ]);
        $this->postJson('/api/login', [
            'email' => $email,
            'password' => $password,
        ])->assertOk();
    }

    private function fakeCoverImage(string $filename): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $filename,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lS8AAAAASUVORK5CYII='),
        );
    }

    private function actingAsFresh(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->actingAs($user, 'sanctum');
    }
}
