import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PaginationControls from '../../../frontend/src/components/PaginationControls.jsx'

describe('PaginationControls', () => {
  describe('cuando no debe renderizarse', () => {
    it('retorna null con total_pages = 1', () => {
      const { container } = render(
        <PaginationControls
          pagination={{ total_pages: 1, page: 1 }}
          onPageChange={() => {}}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('retorna null con total_pages = 0', () => {
      const { container } = render(
        <PaginationControls
          pagination={{ total_pages: 0, page: 1 }}
          onPageChange={() => {}}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('retorna null sin prop pagination', () => {
      const { container } = render(
        <PaginationControls pagination={null} onPageChange={() => {}} />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('estructura basica', () => {
    it('debe renderizar boton "Anterior"', () => {
      render(
        <PaginationControls
          pagination={{ total_pages: 5, page: 3, has_prev: true, has_next: true }}
          onPageChange={() => {}}
        />
      )
      expect(screen.getByText('Anterior')).toBeTruthy()
    })

    it('debe renderizar boton "Siguiente"', () => {
      render(
        <PaginationControls
          pagination={{ total_pages: 5, page: 3, has_prev: true, has_next: true }}
          onPageChange={() => {}}
        />
      )
      expect(screen.getByText('Siguiente')).toBeTruthy()
    })

    it('debe usar el aria-label recibido como prop', () => {
      const { container } = render(
        <PaginationControls
          pagination={{ total_pages: 3, page: 1, has_prev: false, has_next: true }}
          onPageChange={() => {}}
          label="Navegacion de productos"
        />
      )
      const nav = container.querySelector('nav')
      expect(nav.getAttribute('aria-label')).toBe('Navegacion de productos')
    })

    it('debe usar "Paginacion" como aria-label por defecto', () => {
      const { container } = render(
        <PaginationControls
          pagination={{ total_pages: 3, page: 1, has_prev: false, has_next: true }}
          onPageChange={() => {}}
        />
      )
      const nav = container.querySelector('nav')
      expect(nav.getAttribute('aria-label')).toBe('Paginacion')
    })
  })

  describe('estados deshabilitados', () => {
    it('debe deshabilitar "Anterior" cuando has_prev es false', () => {
      render(
        <PaginationControls
          pagination={{ total_pages: 5, page: 1, has_prev: false, has_next: true }}
          onPageChange={() => {}}
        />
      )
      expect(screen.getByText('Anterior').disabled).toBe(true)
    })

    it('debe habilitar "Anterior" cuando has_prev es true', () => {
      render(
        <PaginationControls
          pagination={{ total_pages: 5, page: 3, has_prev: true, has_next: true }}
          onPageChange={() => {}}
        />
      )
      expect(screen.getByText('Anterior').disabled).toBe(false)
    })

    it('debe deshabilitar "Siguiente" cuando has_next es false', () => {
      render(
        <PaginationControls
          pagination={{ total_pages: 5, page: 5, has_prev: true, has_next: false }}
          onPageChange={() => {}}
        />
      )
      expect(screen.getByText('Siguiente').disabled).toBe(true)
    })

    it('debe habilitar "Siguiente" cuando has_next es true', () => {
      render(
        <PaginationControls
          pagination={{ total_pages: 5, page: 3, has_prev: true, has_next: true }}
          onPageChange={() => {}}
        />
      )
      expect(screen.getByText('Siguiente').disabled).toBe(false)
    })
  })

  describe('pagina activa', () => {
    it('debe marcar la pagina actual con clase "is-active"', () => {
      render(
        <PaginationControls
          pagination={{ total_pages: 5, page: 3, has_prev: true, has_next: true }}
          onPageChange={() => {}}
        />
      )
      const activePage = screen.getByText('3')
      expect(activePage.className).toContain('is-active')
    })

    it('las demas paginas no deben tener clase "is-active"', () => {
      render(
        <PaginationControls
          pagination={{ total_pages: 5, page: 3, has_prev: true, has_next: true }}
          onPageChange={() => {}}
        />
      )
      const page2 = screen.getByText('2')
      expect(page2.className).not.toContain('is-active')
    })
  })

  describe('interacciones onPageChange', () => {
    it('debe llamar onPageChange con el numero de pagina al hacer click', () => {
      const onPageChange = jasmine.createSpy('onPageChange')
      render(
        <PaginationControls
          pagination={{ total_pages: 5, page: 2, has_prev: true, has_next: true }}
          onPageChange={onPageChange}
        />
      )
      fireEvent.click(screen.getByText('4'))
      expect(onPageChange).toHaveBeenCalledWith(4)
    })

    it('debe llamar onPageChange con page-1 al click en "Anterior"', () => {
      const onPageChange = jasmine.createSpy('onPageChange')
      render(
        <PaginationControls
          pagination={{ total_pages: 5, page: 3, has_prev: true, has_next: true }}
          onPageChange={onPageChange}
        />
      )
      fireEvent.click(screen.getByText('Anterior'))
      expect(onPageChange).toHaveBeenCalledWith(2)
    })

    it('debe llamar onPageChange con page+1 al click en "Siguiente"', () => {
      const onPageChange = jasmine.createSpy('onPageChange')
      render(
        <PaginationControls
          pagination={{ total_pages: 5, page: 3, has_prev: true, has_next: true }}
          onPageChange={onPageChange}
        />
      )
      fireEvent.click(screen.getByText('Siguiente'))
      expect(onPageChange).toHaveBeenCalledWith(4)
    })
  })

  describe('ventana de paginas visibles', () => {
    it('debe mostrar como maximo 5 paginas visibles', () => {
      const { container } = render(
        <PaginationControls
          pagination={{ total_pages: 20, page: 10, has_prev: true, has_next: true }}
          onPageChange={() => {}}
        />
      )
      const pageButtons = container.querySelectorAll('.pagination__page')
      expect(pageButtons.length).toBeLessThanOrEqual(5)
    })

    it('debe mostrar todas las paginas cuando total_pages es 3', () => {
      const { container } = render(
        <PaginationControls
          pagination={{ total_pages: 3, page: 1, has_prev: false, has_next: true }}
          onPageChange={() => {}}
        />
      )
      const pageButtons = container.querySelectorAll('.pagination__page')
      expect(pageButtons.length).toBe(3)
    })
  })
})
