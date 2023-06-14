// The credits who made this possible
export const credits = {
  author: "lkraider",
  profile: "https://gist.github.com/lkraider",
  source: "https://gist.github.com/lkraider/f0888da30bc352f9d167dfa4f4fc8213",
}

export const gsExec= "gs"

export const gsArgs = " \
-sDEVICE=pdfwrite \
-dPDFSETTINGS=/prepress \
-dSubsetFonts=true \
-dCompressFonts=true \
-sProcessColorModel=DeviceRGB \
-sColorConversionStrategy=sRGB \
-sColorConversionStrategyForImages=sRGB \
-dConvertCMYKImagesToRGB=true \
-dDetectDuplicateImages=true \
-dDownsampleColorImages=true -dDownsampleGrayImages=true -dDownsampleMonoImages=true \
-dColorImageResolution=150 -dGrayImageResolution=150 -dMonoImageResolution=150 \
-dDoThumbnails=false \
-dCreateJobTicket=false \
-dPreserveEPSInfo=false \
-dPreserveOPIComments=false \
-dPreserveOverprintSettings=false \
-dUCRandBGInfo=/Remove \
-o \"{{output}}\" \
-f \"{{input}}\" \
"

export const gsShortArgs = " \
-sDEVICE=pdfwrite \
-o \"{{output}}\" \
-f \"{{input}}\" \
-dDEBUG \
"

export const gsCmd = `${gsExec} ${gsArgs}`