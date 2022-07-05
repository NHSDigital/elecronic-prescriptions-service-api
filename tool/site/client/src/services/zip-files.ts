import JSZip from "jszip"
import FileSaver from "file-saver"

interface ZipFileItem {
  fileName: string
  item: string
}

export const zip = async (zipFileName: string, itemsToBeZipped: Array<ZipFileItem>): Promise<void> => {
  const zip = JSZip()

  itemsToBeZipped.forEach(item => {
    zip.file(item.fileName, item.item)
  })

  zip.generateAsync({type: "blob"}).then(zipFile => {
    return FileSaver.saveAs(zipFile, `${zipFileName}.zip`)
  })
}
