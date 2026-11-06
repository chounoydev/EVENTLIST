<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_active || ! in_array($user->role, ['owner', 'admin'], true)) {
            return response()->json(['message' => 'This account does not have portal access.'], 403);
        }

        return $next($request);
    }
}
