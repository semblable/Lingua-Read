import React from 'react';
import { Navbar, Nav, Container, /*Button,*/ NavDropdown } from 'react-bootstrap'; // Removed unused Button
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../utils/store';


const Navigation = () => {
  const { token, /*user,*/ clearToken } = useAuthStore(); // Removed unused user
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">LinguaRead</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            {token && (
              <>
                <NavDropdown title="Books" id="books-dropdown">
                  <NavDropdown.Item as={Link} to="/books">My Books</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/books/create">Add New Book</NavDropdown.Item>
                </NavDropdown>
                
                <NavDropdown title="Texts" id="texts-dropdown">
                  <NavDropdown.Item as={Link} to="/texts">My Texts</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/texts/create">Add Individual Text</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/texts/create-audio">Add Audio Lesson</NavDropdown.Item> {/* Add link for audio lesson */}
                </NavDropdown>
                
                <Nav.Link as={Link} to="/statistics">Statistics</Nav.Link>
                <Nav.Link as={Link} to="/terms">Terms</Nav.Link> {/* Add Terms link */}
              </>
            )}
          </Nav>
          
          <Nav>
            {token ? (
              <NavDropdown title="Account" id="account-dropdown" align="end">
                <NavDropdown.Item as={Link} to="/settings">User Settings</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/settings/languages">Languages</NavDropdown.Item> {/* <-- Add Languages link */}
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
              </NavDropdown>
            ) : (
              <>
                <Nav.Link as={Link} to="/login">Login</Nav.Link>
                <Nav.Link as={Link} to="/register">Register</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation; 