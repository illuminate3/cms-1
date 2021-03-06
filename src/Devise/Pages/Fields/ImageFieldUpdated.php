<?php namespace Devise\Pages\Fields;

use Devise\Media\Images\Images;
use Devise\Media\Images\InvalidImageException;
use Devise\Media\MediaPaths;

/**
 * This class should be registered in a service provider
 * for PagesServiceProvider. It is called anytime a
 * field with type "image" is updated. We do this so we
 * can hook into the updated event and then create media
 * versions and thumbnails for this image field
 */
class ImageFieldUpdated
{
	/**
	 * Constructs a new Image field updated event handler
     *
	 * @param Images        $Images
	 * @param MediaPaths 	$MediaPaths
	 */
	public function __construct(Images $Images, MediaPaths $MediaPaths)
	{
		$this->MediaPaths = $MediaPaths;
		$this->Images = $Images;
		$this->basepath = $this->MediaPaths->basePath();
	}

	/**
	 * This is called anytime after we update an image field
	 * in devise
	 *
	 * @param  Field       $field
	 * @param  array       $input
	 * @return array
	 */
	public function handle($field, $input, $beforeChanges)
	{
		$imageVersion = $this->createVersionOfImage($field, $input);

		$field->values->merge([
			'has_thumbnail' => array_get($input, 'has_thumbnail', false),
			'original' => array_get($input, 'image', ''),
			'image' => $imageVersion,
			'image_url' => $imageVersion,
			'thumbnail_url' => $this->createThumbnailOfImage($field, $input),
		]);

		$field->json_value = $field->values->toJSON();

		$field->save();
	}

	/**
	 * Create a version of this image, crops too when
	 * $crop is set to true
	 *
	 * @param Field $field
	 * @param boolean      $crop
	 * @return string
	 */
	protected function createVersionOfImage($field, $input)
	{
		if (!$field->values->image(false))
		{
			return '';
		}

		return array_get($input, '_crop_image', false)
			? $this->croppedImagePath($field)
			: $this->versionedImagePath($field);
	}

	/**
	 * Create a version of this thumbnail, crops too when
	 * $crop is set to true
	 *
	 * @param Field $field
	 * @param boolean      $crop
	 * @return string
	 */
	protected function createThumbnailOfImage($field, $input)
	{
		if (!array_get($input, 'has_thumbnail', false) || !$field->values->image(false))
		{
			return '';
		}

		return array_get($input, '_crop_thumbnail', false)
			? $this->croppedImagePath($field, 'thumbnail')
			: $this->resizedImagePath($field, 200, 200);
	}

	/**
	 * Create a version of this thumbnail, crops too when
	 * $crop is set to true
	 *
	 * @param Field $field
	 * @param boolean      $crop
	 * @return string
	 */
	protected function resizedImagePath($field, $width, $height)
	{
		// get the parts for this file string
		$info = $this->MediaPaths->fileVersionInfo($field->values->image);

		// create resizedImagePath
		$resizedImagePath = "{$info->versiondir}/{$info->filename}_{$width}_{$height}.{$info->ext}";

		// resize the versioned image
		$image = $this->Images->resizeImage($info->filepath, $width, $height);

		// save this resized image
		$this->Images->saveImage($image, $resizedImagePath);

		// remove temporary image file if there is one
		if ($info->tempfile) unlink($info->tempfile);

        // finally return this image path as a string so we can store it
        return $this->MediaPaths->makeRelativePath($resizedImagePath);
	}

	/**
	 * Creates a versioned copy of this image
	 *
	 * @param Field $field
	 * @return string
	 */
	protected function versionedImagePath($field)
	{
		if ($this->MediaPaths->isUrlPath($field->values->image))
		{
			return $field->values->image;
		}

		$info = $this->MediaPaths->fileVersionInfo($field->values->image);

		if ($info->tempfile) unlink($info->tempfile);

		return $this->MediaPaths->makeRelativePath($info->filepath);
	}

	/**
	 * Creates a cropped versioned copy of this image
	 *
	 * @param string       $fromImagePath
	 * @param Field $field
	 * @return string
	 */
	protected function croppedImagePath($field, $type = 'image')
	{
		// gather info about this file and where it should be versioned
		$info = $this->MediaPaths->fileVersionInfo($field->values->image);

		// setting variables so we can easily access them later
		$width = $field->values->{$type . '_width'};
		$height = $field->values->{$type . '_height'};
		$cropWidth = $field->values->{$type . '_crop_w'};
		$cropHeight = $field->values->{$type . '_crop_h'};
		$cropX = $field->values->{$type . '_crop_x'};
		$cropY = $field->values->{$type . '_crop_y'};

		// this is the croppedImagePath
		$croppedImagePath = "{$info->versiondir}/{$info->filename}_{$width}_{$height}_{$cropX}_{$cropY}.{$info->ext}";

		// crop and resize the versioned image
		$image = $this->Images->cropAndResizeImage($info->filepath, $width, $height, $cropWidth, $cropHeight, $cropX, $cropY);

		// save this cropped image
		$this->Images->saveImage($image, $croppedImagePath);

		// remove temporary image file if there is one
		if ($info->tempfile) unlink($info->tempfile);

        // finally return this image path as a string so we can store it
        return $this->MediaPaths->makeRelativePath($croppedImagePath);
	}
}