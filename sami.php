<?php

use Sami\Sami;
use Symfony\Component\Finder\Finder;

$iterator = Finder::create()
	->files()
	->name('*.php')
	->in(__DIR__ . '/src');


return new Sami($iterator, array(
	'title'                => 'Devise',
	'build_dir'            => __DIR__. '/public/docs',
	'cache_dir'            => __DIR__. '/.sami-cache',
	'default_opened_level' => 2,
));