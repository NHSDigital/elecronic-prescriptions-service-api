import React from "react"
import classnames from "classnames"
import {usePagination, DOTS} from "./usePagination"

interface PaginationProps {
  totalCount: number
  currentPage: number
  pageSize?: number
  onPageChange: (pageChangeNumber: number) => void
  siblingCount?: number
}

const Pagination = (props: PaginationProps): any => {
  const {
    onPageChange,
    totalCount,
    siblingCount = 8,
    currentPage,
    pageSize = 1
  } = props

  const paginationRange = usePagination({
    currentPage,
    totalCount,
    siblingCount,
    pageSize
  })

  // If there are less than 2 times in pagination range we shall not render the component
  if (currentPage === 0 || paginationRange.length < 2) {
    return null
  }

  const onNext = () => {
    onPageChange(currentPage + 1)
  }

  const onPrevious = () => {
    onPageChange(currentPage - 1)
  }

  const lastPage = paginationRange[paginationRange.length - 1]

  return (
    <ul className="pagination-container">
      {/* Left navigation arrow */}
      <li
        className={classnames("pagination-item", {
          disabled: currentPage === 1
        })}
        onClick={onPrevious}
      >
        <div className="arrow left" />
      </li>
      {paginationRange.map((pageNumber, index) => {

        // If the pageItem is a DOT, render the DOTS unicode character
        if (pageNumber === DOTS) {
          return <li className="pagination-item dots">&#8230;</li>
        }

        // Render our Page Pills
        //TODO: center the number in the dot
        return (
          <li
            key={index}
            className={classnames("pagination-item", {
              selected: pageNumber === currentPage
            })}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </li>
        )
      })}
      {/*  Right Navigation arrow */}
      <li
        className={classnames("pagination-item", {
          disabled: currentPage === lastPage
        })}
        onClick={onNext}
      >
        <div className="arrow right" />
      </li>
    </ul>
  )
}

interface ComponentWithPaginationProps extends PaginationProps {
  children: React.ReactChild | React.ReactChild[]
}

const PaginationWrapper = ({
  children,
  currentPage,
  totalCount,
  onPageChange,
  pageSize
}: ComponentWithPaginationProps) => {
  return (
    <>
      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange} />

      {children}

      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange} />
    </>

  )
}

export default Pagination
export {
  PaginationWrapper
}
