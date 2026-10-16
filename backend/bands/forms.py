from django import forms
from django.core.files.uploadedfile import UploadedFile
from core.cms import LOCALES
from core.images import ImageUploadError, prepare_image
from .models import BandPage


class BandPageForm(forms.ModelForm):
    # Declare these at class creation so Django admin includes them in its layout.
    for attribute in ("image_caption", "image_alt", "description_translations"):
        for locale in LOCALES:
            locals()[f"{attribute}_{locale}"] = forms.CharField(
                label=f"{attribute.replace('_', ' ').capitalize()} ({locale})",
                max_length=20000 if attribute == "description_translations" else 500,
                required=False,
            )

    class Meta:
        model = BandPage
        exclude = ("image_caption", "image_alt", "description_translations")
        widgets = {"background_colour": forms.TextInput(attrs={"type": "color"})}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for attribute in ("image_caption", "image_alt", "description_translations"):
            for locale in LOCALES:
                self.fields[f"{attribute}_{locale}"].initial = (
                    getattr(self.instance, attribute, {}).get(
                        locale, self.instance.description_html
                        if attribute == "description_translations" else ""
                    )
                )

    def clean_main_image(self):
        value = self.cleaned_data.get("main_image")
        if isinstance(value, UploadedFile):
            try:
                return prepare_image(value)
            except ImageUploadError as error:
                raise forms.ValidationError(
                    "Upload a JPEG, PNG or WebP up to 5 MiB and 20 megapixels."
                ) from error
        return value

    def clean(self):
        cleaned = super().clean()
        for attribute in ("image_caption", "image_alt", "description_translations"):
            if attribute == "description_translations":
                translations = dict(self.instance.description_translations)
                for locale in LOCALES:
                    name = f"{attribute}_{locale}"
                    if self.add_prefix(name) in self.data and name in self.changed_data:
                        translations[locale] = cleaned.get(name, "")
                self.instance.description_translations = translations
                continue
            setattr(self.instance, attribute, {
                locale: cleaned.get(f"{attribute}_{locale}", "") for locale in LOCALES
            })
        return cleaned
