<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Symfony\Component\HttpFoundation\Response;

class AdminController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => User::query()
                ->whereIn('role', ['owner', 'admin'])
                ->orderByRaw("CASE WHEN role = 'owner' THEN 0 ELSE 1 END")
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'role', 'is_active', 'created_at']),
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'email' => strtolower(trim((string) $request->input('email'))),
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'max:255', 'confirmed', Password::min(12)->letters()->mixedCase()->numbers()->symbols()],
        ]);
        $admin = new User($validated);
        $admin->forceFill([
            'role' => 'admin',
            'is_active' => true,
        ])->save();

        return response()->json([
            'data' => $admin->only(['id', 'name', 'email', 'role', 'is_active', 'created_at']),
        ], Response::HTTP_CREATED);
    }

    public function destroy(Request $request, User $user)
    {
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'The portal owner cannot be removed.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($request->user()->is($user)) {
            return response()->json(['message' => 'You cannot remove your own administrator account.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Administrator removed successfully.']);
    }
}
