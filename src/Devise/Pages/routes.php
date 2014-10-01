<?php

/*
|--------------------------------------------------------------------------
| Pages
|--------------------------------------------------------------------------
|
| Loading all pages and creating routes from slugs
|
*/
try {
	Route::any('/api/notifications/zencoder', ['uses' => 'Devise\Pages\Controllers\ZencoderNotificationsController@store', 'as' => 'dvs-api-notifications-zencoder']);

	if (\Schema::hasTable('dvs_pages')) {
		$pages = DB::table('dvs_pages')->select('http_verb','slug','route_name')->get();

		if (count($pages)) {
            foreach ($pages as $page) {

	            $slugRegex = '/([^[\}]+)(?:$|\{)/';

				$page->slug = preg_replace_callback($slugRegex, function ($matches) {
					return strtolower($matches[0]);
				}, $page->slug, -1, $count);

                $verb = $page->http_verb;
                Route::$verb($page->slug, array('as' => $page->route_name, 'uses' => 'DevisePageController@show'));
            }
        }
    }
} catch (\Exception $e) {
    // database server is not accessible
}