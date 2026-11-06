<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HeroSlide;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HeroSlideController extends Controller
{
    public function publicIndex()
    {
        return response()->json([
            'data' => HeroSlide::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(),
        ]);
    }

    public function index()
    {
        return response()->json([
            'data' => HeroSlide::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $slide = HeroSlide::create($this->validatedData($request));

        return response()->json(['data' => $slide], Response::HTTP_CREATED);
    }

    public function update(Request $request, HeroSlide $slide)
    {
        $slide->update($this->validatedData($request));

        return response()->json(['data' => $slide->refresh()]);
    }

    public function destroy(HeroSlide $slide)
    {
        $slide->delete();

        return response()->json(['message' => 'Hero slide deleted successfully.']);
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'eyebrow' => ['required', 'string', 'max:100'],
            'title' => ['required', 'string', 'max:160'],
            'description' => ['required', 'string', 'max:500'],
            'art_text' => ['required', 'string', 'max:80'],
            'symbol' => ['required', 'string', 'max:12'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:999'],
            'is_active' => ['required', 'boolean'],
        ]);
    }
}
