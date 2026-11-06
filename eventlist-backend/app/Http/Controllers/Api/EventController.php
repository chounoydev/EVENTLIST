<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class EventController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Event::query()
                ->orderBy('event_date')
                ->orderBy('event_time')
                ->orderBy('id')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validatedData($request);
        $imagePath = null;

        try {
            $imagePath = $this->storeCoverImage($request);
            $event = Event::create([...$validated, 'image_path' => $imagePath]);
        } catch (Throwable $exception) {
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }

            throw $exception;
        }

        return response()->json(['data' => $event], 201);
    }

    public function show(Event $event)
    {
        return response()->json(['data' => $event]);
    }

    public function update(Request $request, Event $event)
    {
        $validated = $this->validatedData($request);
        $oldImagePath = $event->image_path;
        $newImagePath = null;

        try {
            if ($request->hasFile('cover_image')) {
                $newImagePath = $this->storeCoverImage($request);
                $validated['image_path'] = $newImagePath;
            } elseif ($request->boolean('remove_image')) {
                $validated['image_path'] = null;
            }

            $event->update($validated);
        } catch (Throwable $exception) {
            if ($newImagePath) {
                Storage::disk('public')->delete($newImagePath);
            }

            throw $exception;
        }

        if ($oldImagePath && array_key_exists('image_path', $validated) && $oldImagePath !== $validated['image_path']) {
            Storage::disk('public')->delete($oldImagePath);
        }

        return response()->json(['data' => $event->refresh()]);
    }

    public function destroy(Event $event)
    {
        $imagePath = $event->image_path;
        $event->delete();

        if ($imagePath) {
            Storage::disk('public')->delete($imagePath);
        }

        return response()->json(['message' => 'Event deleted successfully.']);
    }

    private function validatedData(Request $request): array
    {
        $required = $request->isMethod('patch') ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$required, 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => [$required, 'string', 'max:255'],
            'event_date' => [$required, 'date'],
            'event_time' => ['nullable', 'date_format:H:i'],
            'organizer' => ['nullable', 'string', 'max:255'],
            'capacity' => [$required, 'integer', 'min:0', 'max:4294967295'],
            'cover_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:5120'],
            'remove_image' => ['sometimes', 'boolean'],
        ]);
    }

    private function storeCoverImage(Request $request): ?string
    {
        if (! $request->hasFile('cover_image')) {
            return null;
        }

        $path = $request->file('cover_image')->store('events', 'public');

        if (! is_string($path) || $path === '') {
            throw new RuntimeException('The event cover image could not be saved.');
        }

        return $path;
    }
}
